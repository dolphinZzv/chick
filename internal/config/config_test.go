package config

import (
	"os"
	"testing"
)

func TestLoadDefaults(t *testing.T) {
	cfg := Load()
	if cfg.DBDriver != "sqlite3" {
		t.Errorf("expected sqlite3, got %s", cfg.DBDriver)
	}
	if cfg.Port != "8080" {
		t.Errorf("expected 8080, got %s", cfg.Port)
	}
}

func TestLoadFromEnv(t *testing.T) {
	os.Setenv("MORNING_GLORY_DB_DRIVER", "postgres")
	os.Setenv("MORNING_GLORY_DB_DSN", "host=localhost dbname=test")
	os.Setenv("MORNING_GLORY_PORT", "9090")
	os.Setenv("MORNING_GLORY_JWT_SECRET", "jwt-secret")
	defer func() {
		os.Unsetenv("MORNING_GLORY_DB_DRIVER")
		os.Unsetenv("MORNING_GLORY_DB_DSN")
		os.Unsetenv("MORNING_GLORY_PORT")
		os.Unsetenv("MORNING_GLORY_JWT_SECRET")
	}()

	cfg := Load()
	if cfg.DBDriver != "postgres" {
		t.Errorf("expected postgres, got %s", cfg.DBDriver)
	}
	if cfg.DBDSN != "host=localhost dbname=test" {
		t.Errorf("expected custom DSN, got %s", cfg.DBDSN)
	}
	if cfg.Port != "9090" {
		t.Errorf("expected 9090, got %s", cfg.Port)
	}
	if cfg.JWTSecret != "jwt-secret" {
		t.Errorf("expected jwt-secret, got %s", cfg.JWTSecret)
	}
}

func TestUsePostgreSQL(t *testing.T) {
	cfg := &Config{DBDriver: "postgres"}
	if !cfg.UsePostgreSQL() {
		t.Error("expected true for postgres")
	}

	cfg2 := &Config{DBDriver: "sqlite3"}
	if cfg2.UsePostgreSQL() {
		t.Error("expected false for sqlite3")
	}
}
