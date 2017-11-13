package main

import (
	"encoding/json"
	"log"
	"time"

	"github.com/go-redis/redis"

	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"

	"gopkg.in/gomail.v2"
)

var retrySending = int64(300000)

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
		log.Println("Text", mailCached.Text)
	} else if len(mailCached.HTML) > 0 {
		m.SetBody("text/html", mailCached.HTML)
		log.Println("HTML", mailCached.HTML)
	}

	//if *mailCached.Attachments != nil && len(*mailCached.Attachments) > 0 {
	//	m.Attach("/home/Alex/lolcat.jpg")
	//}
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
	for {
		now := time.Now().UnixNano() / int64(time.Millisecond)
		_mails, err := client.LRange("mail.temp", 0, -1).Result()
		if err != nil {
			log.Println(err)
			return
		}
		if len(_mails) > 0 {
			for _, f := range _mails {
				mailCached, err := getMailCached(f)
				if err != nil {
					log.Println(err)
				} else {
					if mailCached.RetryAt == 0 || mailCached.RetryAt < now {
						errSending := sendMail(mailCached)
						_, err := client.LRem("mail.temp", 1, f).Result()
						if err != nil {
							log.Println(err)
						}
						if errSending != nil {
							mailCached.Status--
							if mailCached.Status == -1 || mailCached.Status == -2 {
								mailCached.RetryAt = time.Now().UnixNano()/int64(time.Millisecond) + retrySending
								str, err := json.Marshal(mailCached)
								if err == nil {
									client.RPush("mail.temp", string(str))
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
								log.Println(err)
							}
						}
					}
				}
			}
		}
		time.Sleep(1 * time.Second)
	}
}
