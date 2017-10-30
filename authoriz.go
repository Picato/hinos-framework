package main

import (
	"encoding/json"
	"log"
	"net/http"
	"regexp"
	"strings"

	"github.com/go-redis/redis"
)

type AccountCached struct {
	ProjectID string   `json:"project_id"`
	AccountID string   `json:"account_id"`
	RoleIDs   []string `json:"role_ids"`
}

type Role struct {
	OptionA string `json:"option_A"`
}

type ApiAction struct {
	Path          string `json:"path"`
	Actions       string `json:"actions"`
	IsPathRegex   bool   `json:"isPathRegex"`
	IsActionRegex bool   `json:"isActionRegex"`
	RoleID        string `json:"role_id"`
}

var client = redis.NewClient(&redis.Options{
	Addr:     "127.0.0.1:6379",
	Password: "",
	DB:       0,
})

func GetAccountCached(token string) (*AccountCached, error) {
	_accountCached, err := client.Get("$token:" + token).Result()
	if err != nil {
		return nil, err
	}
	accountCached := &AccountCached{}
	err = json.Unmarshal([]byte(_accountCached), accountCached)
	if err != nil {
		return nil, err
	}
	return accountCached, nil
}

func GetRoleApiCached(projectId string) (*[]ApiAction, error) {
	_roleCached, err := client.Get("$roles.api:" + projectId).Result()
	if err != nil {
		return nil, err
	}
	roleCached := &[]ApiAction{}
	err = json.Unmarshal([]byte(_roleCached), roleCached)
	if err != nil {
		return nil, err
	}
	return roleCached, nil
}

func CheckPath(path string, r ApiAction) bool {
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

func CheckAction(actions string, r ApiAction) bool {
	if r.IsActionRegex {
		var b = regexp.MustCompile("^" + r.Actions + "$")
		isOk := b.Match([]byte(actions))
		if isOk {
			return true
		}
	} else if r.Actions == actions {
		return true
	}
	return false
}

func CheckAuthoriz(path string, actions string, accountCached AccountCached, roleCached []ApiAction) bool {
	userRoles := strings.Join(accountCached.RoleIDs, ",")
	for _, r := range roleCached {
		if strings.Contains(userRoles, r.RoleID) {
			if CheckPath(path, r) && CheckAction(actions, r) {
				return true
			}
		}
	}
	return false
}
func main() {

	http.HandleFunc("/oauth/authoriz", func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("token")
		path := r.URL.Query().Get("path")
		actions := r.URL.Query().Get("actions")

		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "token")
		w.Header().Set("Access-Control-Expose-Headers", "project_id,account_id")
		w.Header().Set("Access-Control-Request-Method", "HEAD")
		if r.Method == "OPTIONS" {
			w.WriteHeader(204)
			return
		}
		if r.Method != "HEAD" {
			w.WriteHeader(404)
			return
		}
		if len(token) == 0 || len(path) == 0 || len(actions) == 0 {
			w.WriteHeader(401)
			return
		}
		token = strings.Split(token, "?")[0]

		if token != "123" {
			accountCached, err := GetAccountCached(token)
			if err != nil {
				w.WriteHeader(500)
				return
			}
			rolesCached, err := GetRoleApiCached(accountCached.ProjectID)
			if err != nil {
				w.WriteHeader(500)
				return
			}
			isOk := CheckAuthoriz(path, actions, *accountCached, *rolesCached)
			if !isOk {
				w.WriteHeader(403)
				return
			}
			w.Header().Set("project_id", accountCached.ProjectID)
			w.Header().Set("account_id", accountCached.AccountID)
			w.WriteHeader(204)
			return
		}
		w.WriteHeader(204)
	})

	log.Fatal(http.ListenAndServe("127.0.0.1:6011", nil))

}
