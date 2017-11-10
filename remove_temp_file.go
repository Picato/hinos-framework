package main

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/go-redis/redis"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
)

type fileCached struct {
	ID        string   `json:"_id"`
	ExpiredAt int64    `json:"expired_at"`
	Files     []string `json:"files"`
}

var client = redis.NewClient(&redis.Options{
	Addr:     "127.0.0.1:6379",
	Password: "",
	DB:       0,
})

func getFileCached(_fileCached string) (*fileCached, error) {
	fileCached := &fileCached{}
	err := json.Unmarshal([]byte(_fileCached), fileCached)
	if err != nil {
		return nil, err
	}
	return fileCached, nil
}

func removeFile(fileCached *fileCached) (bool, error) {
	session, err := mgo.Dial("localhost")
	if err != nil {
		return false, err
	}
	defer session.Close()
	session.SetMode(mgo.Monotonic, true)

	c := session.DB("files").C("Files")
	err = c.RemoveId(bson.ObjectIdHex(fileCached.ID))
	if err != nil {
		return false, err
	}
	for _, f := range fileCached.Files {
		absPath, _err := filepath.Abs("./assets/" + f)
		if _err == nil {
			_err = os.Remove(absPath)
			if _err != nil {
				log.Println(_err)
			}
		} else {
			log.Println(_err)
		}
	}
	return true, nil
}

func main() {
	for {
		now := time.Now().UnixNano() / int64(time.Millisecond)
		_files, err := client.LRange("files.temp", 0, -1).Result()
		if err != nil {
			log.Println(err)
			return
		}
		if len(_files) > 0 {
			for _, f := range _files {
				fileCached, err := getFileCached(f)
				if err != nil {
					log.Println(err)
				} else {
					if fileCached.ExpiredAt < now {
						isOk, _err := removeFile(fileCached)
						if !isOk {
							log.Println(_err)
						} else {
							_, err := client.LRem("files.temp", 1, f).Result()
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
