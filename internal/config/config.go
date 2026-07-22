package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	DBDriver                    string
	DBDSN                       string
	Port                        string
	JWTSecret                   string
	AdminToken                  string
	AllowedOrigins              []string
	DevMode                     bool
	AllowHumanRegistration      bool
	MCPAllowedCIDRs             []string
	DefaultRequirementProjectID uint
	PprofEnabled                bool
	RedisAddr                   string
	RedisPassword               string
	RedisDB                     int
	MatchingCheckInterval       string
	MatchingOfflineTimeout      string
}

func Load() *Config {
	origins := getEnv("MORNING_GLORY_ALLOWED_ORIGINS", "")
	return &Config{
		DBDriver:                    getEnv("MORNING_GLORY_DB_DRIVER", "sqlite3"),
		DBDSN:                       getEnv("MORNING_GLORY_DB_DSN", "file:dev.db?_pragma=journal_mode(WAL)"),
		Port:                        getEnv("MORNING_GLORY_PORT", "8080"),
		JWTSecret:                   getEnv("MORNING_GLORY_JWT_SECRET", ""),
		AdminToken:                  getEnv("MORNING_GLORY_ADMIN_TOKEN", ""),
		AllowedOrigins:              splitOrigins(origins),
		DevMode:                     getEnv("MORNING_GLORY_DEV_MODE", "") == "true",
		AllowHumanRegistration:      getEnv("MORNING_GLORY_ALLOW_HUMAN_REGISTRATION", "false") == "true",
		MCPAllowedCIDRs:             splitCIDRs(getEnv("MORNING_GLORY_MCP_ALLOWED_CIDRS", "")),
		DefaultRequirementProjectID: uint(getEnvInt("MORNING_GLORY_REQUIREMENT_PROJECT_ID", 0)),
		PprofEnabled:                getEnv("MORNING_GLORY_PPROF_ENABLED", "false") == "true",
		MatchingCheckInterval:       getEnv("MORNING_GLORY_MATCHING_CHECK_INTERVAL", "60s"),
		MatchingOfflineTimeout:      getEnv("MORNING_GLORY_MATCHING_OFFLINE_TIMEOUT", "5m"),
		RedisAddr:                   getEnv("MORNING_GLORY_REDIS_ADDR", "localhost:6379"),
		RedisPassword:               getEnv("MORNING_GLORY_REDIS_PASSWORD", ""),
		RedisDB:                     getEnvInt("MORNING_GLORY_REDIS_DB", 1),
	}
}

func splitCIDRs(s string) []string {
	if s == "" {
		return nil
	}
	var result []string
	for _, c := range strings.Split(s, ",") {
		c = strings.TrimSpace(c)
		if c != "" {
			result = append(result, c)
		}
	}
	return result
}

func splitOrigins(s string) []string {
	if s == "" {
		return nil
	}
	var result []string
	for _, o := range strings.Split(s, ",") {
		o = strings.TrimSpace(o)
		if o != "" {
			result = append(result, o)
		}
	}
	return result
}

func (c *Config) UsePostgreSQL() bool {
	return strings.HasPrefix(c.DBDriver, "postgres")
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}
