package main

import (
	"encoding/json"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/go-redis/redis"
)

type accountCached struct {
	ProjectID string   `json:"project_id"`
	AccountID string   `json:"account_id"`
	RoleIDs   []string `json:"role_ids"`
}

type apiActionCached struct {
	Path          string `json:"path"`
	Actions       string `json:"actions"`
	IsPathRegex   bool   `json:"isPathRegex"`
	IsActionRegex bool   `json:"isActionRegex"`
	RoleID        string `json:"role_id"`
}

type pluginCached struct {
	Oauth *pluginOauthCached `json:"oauth"`
}

type pluginOauthCached struct {
	App            []string `json:"app"`
	IsVerify       bool     `json:"is_verify"`
	SessionExpired int      `json:"session_expired"`
	SingleMode     bool     `json:"single_mode"`
	Trying         int      `json:"trying"`
}

var client = redis.NewClient(&redis.Options{
	Addr:     "127.0.0.1:6379",
	Password: "",
	DB:       0,
})

func GetAccountCached(token string) (*accountCached, error) {
	_accountCached, err := client.Get("$tk:" + token).Result()
	if err != nil {
		return nil, err
	}
	accountCached := &accountCached{}
	err = json.Unmarshal([]byte(_accountCached), accountCached)
	if err != nil {
		return nil, err
	}
	return accountCached, nil
}

func getRoleApiCached(projectId string) (*[]apiActionCached, error) {
	_roleCached, err := client.HGet("$p:"+projectId, "apis").Result()
	if err != nil {
		return nil, err
	}
	roleCached := &[]apiActionCached{}
	err = json.Unmarshal([]byte(_roleCached), roleCached)
	if err != nil {
		return nil, err
	}
	return roleCached, nil
}

func getPluginCached(projectId string) (*pluginCached, error) {
	_pluginCached, err := client.HGet("$p:"+projectId, "plugins").Result()
	if err != nil {
		return nil, err
	}
	pluginCached := &pluginCached{}
	err = json.Unmarshal([]byte(_pluginCached), pluginCached)
	if err != nil {
		return nil, err
	}
	return pluginCached, nil
}

func CheckPath(path string, r apiActionCached) bool {
	if !r.IsPathRegex && r.Path == path {
		return true
	} else if r.IsPathRegex {
		isOk, err := regexp.Match("^"+r.Path+"$", []byte(path))
		if err == nil {
			return isOk
		}
	}
	return false
}

func CheckAction(action string, r apiActionCached) bool {
	if r.IsActionRegex {
		var b = regexp.MustCompile("^" + r.Actions + "$")
		isOk := b.Match([]byte(action))
		if isOk {
			return true
		}
	} else if r.Actions == action {
		return true
	}
	return false
}

func CheckAuthoriz(path string, action string, accountCached *accountCached, roleCached []apiActionCached) bool {
	userRoles := strings.Join(accountCached.RoleIDs, ",")
	for _, r := range roleCached {
		if strings.Contains(userRoles, r.RoleID) {
			if CheckPath(path, r) && CheckAction(action, r) {
				return true
			}
		}
	}
	return false
}

func handleAuthoriz(token string, path string, action string, accountCached *accountCached) (bool, error) {
	rolesCached, err := getRoleApiCached(accountCached.ProjectID)
	if err != nil {
		return false, err
	}
	isOk := CheckAuthoriz(path, action, accountCached, *rolesCached)
	return isOk, nil
}

func main() {
	http.HandleFunc("/oauth/Ping", func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("token")

		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "token")
		w.Header().Set("Access-Control-Request-Method", "HEAD")
		if r.Method == "OPTIONS" {
			w.WriteHeader(204)
			return
		}
		if r.Method != "HEAD" {
			w.WriteHeader(405)
			return
		}
		if len(token) == 0 {
			w.WriteHeader(401)
			return
		}

		token = strings.Split(token, "?")[0]

		accountCached, err := GetAccountCached(token)
		if err != nil {
			w.WriteHeader(440)
			return
		}

		pluginCached, err := getPluginCached(accountCached.ProjectID)
		if err != nil {
			w.WriteHeader(500)
			return
		}
		if pluginCached.Oauth.SessionExpired > 0 {
			if pluginCached.Oauth.SessionExpired > 1800 {
				client.ExpireAt("$tk:"+token, time.Now().Add(time.Duration(pluginCached.Oauth.SessionExpired)*time.Second))
			} else {
				client.Expire("$tk:"+token, time.Duration(pluginCached.Oauth.SessionExpired)*time.Second)
			}
		}
		w.WriteHeader(204)
	})

	http.HandleFunc("/oauth/Authoriz", func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("token")
		path := r.URL.Query().Get("path")
		action := r.URL.Query().Get("action")

		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "token")
		w.Header().Set("Access-Control-Expose-Headers", "project_id,account_id")
		w.Header().Set("Access-Control-Request-Method", "HEAD")
		if r.Method == "OPTIONS" {
			w.WriteHeader(204)
			return
		}
		if r.Method != "HEAD" {
			w.WriteHeader(405)
			return
		}
		if len(token) == 0 {
			w.WriteHeader(401)
			return
		}

		if len(path) == 0 || len(action) == 0 {
			w.WriteHeader(400)
			return
		}

		token = strings.Split(token, "?")[0]

		accountCached, err := GetAccountCached(token)
		if err != nil {
			w.WriteHeader(440)
			return
		}

		isOk, err := handleAuthoriz(token, path, action, accountCached)
		if err != nil {
			w.WriteHeader(500)
			return
		}
		if !isOk {
			w.WriteHeader(403)
			return
		}
		w.Header().Set("project_id", accountCached.ProjectID)
		w.Header().Set("account_id", accountCached.AccountID)
		w.WriteHeader(204)
	})

	log.Fatal(http.ListenAndServe("127.0.0.1:6011", nil))

}
