package main

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"log"
	"os"
	"strings"
	"time"

	"github.com/go-redis/redis"

	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"

	"gopkg.in/gomail.v2"
)

var retrySending = int64(300000)
var filesServicePath = "\\files\\assets\\"

type authMailConfig struct {
	User string `json:"user"`
	Pass string `json:"pass"`
}

type mailConfig struct {
	Auth   *authMailConfig `json:"auth"`
	Host   string          `json:"host"`
	Port   int             `json:"port"`
	Secure bool            `json:"secure"`
}

type mailAttachment struct {
	Path        string `json:"path"`
	Filename    string `json:"filename"`
	Content     string `json:"content"`
	ContentType string `json:"contentType"`
	Encoding    string `json:"encoding"`
	Raw         string `json:"raw"`
	FileServ    string `json:"fileserv"`
}

type mailCached struct {
	ID          string            `json:"_id"`
	Config      *mailConfig       `json:"config"`
	Subject     string            `json:"subject"`
	Status      int8              `json:"status"`
	Text        string            `json:"text"`
	HTML        string            `json:"html"`
	From        string            `json:"from"`
	To          []string          `json:"to"`
	Cc          []string          `json:"cc"`
	Attachments *[]mailAttachment `json:"attachments"`
	RetryAt     int64             `json:"retry_at"`
}

var client = redis.NewClient(&redis.Options{
	Addr:     "127.0.0.1:6379",
	Password: "",
	DB:       0,
})

func getMailCached(_mailCached string) (*mailCached, error) {
	mailCached := &mailCached{}
	err := json.Unmarshal([]byte(_mailCached), mailCached)
	if err != nil {
		return nil, err
	}
	return mailCached, nil
}

func sendMail(mailCached *mailCached) error {
	d := gomail.NewDialer(mailCached.Config.Host, mailCached.Config.Port, mailCached.Config.Auth.User, mailCached.Config.Auth.Pass)
	d.SSL = mailCached.Config.Secure

	m := gomail.NewMessage()
	m.SetAddressHeader("From", mailCached.Config.Auth.User, mailCached.From)
	m.SetHeader("To", mailCached.To...)
	if len(mailCached.Cc) > 0 {
		m.SetHeader("Cc", mailCached.Cc...)
	}

	m.SetHeader("Subject", mailCached.Subject)
	if len(mailCached.Text) > 0 {
		m.SetBody("text/plain", mailCached.Text)
	} else if len(mailCached.HTML) > 0 {
		m.SetBody("text/html", mailCached.HTML)
	}
	if mailCached.Attachments != nil && len(*mailCached.Attachments) > 0 {
		for _, a := range *mailCached.Attachments {
			if a.FileServ != "" {
				filePath := strings.Split(a.FileServ, "?")
				absPath := filesServicePath + filePath[0]
				fileName := a.FileServ[strings.Index(a.FileServ, "name=")+5:]
				if strings.Index(fileName, "&") != -1 {
					fileName = fileName[0:strings.Index(fileName, "&")]
				}
				_, err := os.Stat(absPath)
				if os.IsNotExist(err) {
					return errors.New("File \"" + fileName + "\" is not existed: " + absPath)
				}
				m.Attach(absPath, gomail.Rename(fileName))
			}
		}
	}
	return d.DialAndSend(m)
}

func updateMongo(id interface{}, obj interface{}) error {
	session, err := mgo.Dial("localhost")
	if err != nil {
		return err
	}
	defer session.Close()
	session.SetMode(mgo.Monotonic, true)

	c := session.DB("mail").C("Mail")
	err = c.UpdateId(id, obj)
	if err != nil {
		return err
	}
	return nil
}

func main() {
	if len(os.Args) > 0 {
		data, err := base64.StdEncoding.DecodeString(os.Args[1])
		if err != nil {
			log.Fatal(err)
		} else {
			mailCached := &mailCached{}
			err = json.Unmarshal(data, mailCached)
			if err != nil {
				log.Fatal(err)
			} else {
				err = sendMail(mailCached)
				if err != nil {
					log.Fatal(err)
				}
			}
		}
	} else {
		for {
			now := time.Now().UnixNano() / int64(time.Millisecond)
			_mails, err := client.HGetAll("mail.temp").Result()
			if err != nil {
				log.Fatal(err)
			}
			if len(_mails) > 0 {
				for id, f := range _mails {
					mailCached, err := getMailCached(f)
					if err != nil {
						log.Fatal(err)
					} else {
						if mailCached.RetryAt == 0 || mailCached.RetryAt < now {
							errSending := sendMail(mailCached)
							_, err := client.HDel("mail.temp", id).Result()
							if err != nil {
								log.Fatal(err)
							}
							if errSending != nil {
								mailCached.Status--
								if mailCached.Status == -1 || mailCached.Status == -2 {
									mailCached.RetryAt = time.Now().UnixNano()/int64(time.Millisecond) + retrySending
									str, err := json.Marshal(mailCached)
									if err == nil {
										client.HSet("mail.temp", id, string(str))
									}
									err = updateMongo(bson.ObjectIdHex(mailCached.ID), bson.M{
										"$set": bson.M{
											"status":   mailCached.Status,
											"error":    errSending.Error(),
											"retry_at": mailCached.RetryAt,
										},
									})
								} else {
									err = updateMongo(bson.ObjectIdHex(mailCached.ID), bson.M{
										"$set": bson.M{
											"status":   mailCached.Status,
											"error":    nil,
											"retry_at": nil,
										},
									})
								}
							} else {
								err = updateMongo(bson.ObjectIdHex(mailCached.ID), bson.M{
									"$set": bson.M{
										"status":   1,
										"error":    nil,
										"retry_at": nil,
									},
								})
								if err != nil {
									log.Fatal(err)
								}
							}
						}
					}
				}
			}
			time.Sleep(1 * time.Second)
		}
	}
}
