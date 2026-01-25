package main

import (
	"crypto/tls"
	"fmt"
	"log"
	"net/smtp"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

func main() {
	loadEnv()

	host := getEnv("SMTP_HOST", "")
	port := getInt("SMTP_PORT", 587)
	username := getEnv("SMTP_USERNAME", "")
	password := getEnv("SMTP_PASSWORD", "")
	from := getEnv("SMTP_FROM", username)
	to := getEnv("SMTP_TEST_TO", "")

	if host == "" || username == "" || password == "" || to == "" {
		log.Fatal("Missing SMTP_HOST/PORT/USERNAME/PASSWORD or SMTP_TEST_TO env variables")
	}

	subject := getEnv("SMTP_TEST_SUBJECT", "SMTP Smoke Test")
	body := getEnv("SMTP_TEST_BODY", fmt.Sprintf("This is a test email sent at %s", time.Now().Format(time.RFC1123Z)))

	msg := buildMessage(from, to, subject, body)
	addr := fmt.Sprintf("%s:%d", host, port)
	auth := smtp.PlainAuth("", username, password, host)
	envelopeFrom := extractAddress(from)

	log.Printf("Sending test email from %s to %s via %s", envelopeFrom, to, addr)

	var err error
	if port == 465 {
		err = sendImplicitTLS(addr, auth, envelopeFrom, to, msg)
	} else {
		err = smtp.SendMail(addr, auth, envelopeFrom, []string{to}, []byte(msg))
	}
	if err != nil {
		log.Fatalf("SMTP ERROR: %v", err)
	}

	log.Println("EMAIL SENT ✅")
}

func sendImplicitTLS(addr string, auth smtp.Auth, from, to, msg string) error {
	tlsConfig := &tls.Config{ServerName: strings.Split(addr, ":")[0]}
	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		return err
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, tlsConfig.ServerName)
	if err != nil {
		return err
	}
	defer client.Close()

	if auth != nil {
		if err := client.Auth(auth); err != nil {
			return err
		}
	}

	if err := client.Mail(from); err != nil {
		return err
	}
	if err := client.Rcpt(to); err != nil {
		return err
	}
	w, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := w.Write([]byte(msg)); err != nil {
		return err
	}
	if err := w.Close(); err != nil {
		return err
	}
	return client.Quit()
}

func buildMessage(from, to, subject, body string) string {
	headers := []string{
		fmt.Sprintf("From: %s", from),
		fmt.Sprintf("To: %s", to),
		fmt.Sprintf("Subject: %s", subject),
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=\"utf-8\"",
		"",
	}
	return strings.Join(headers, "\r\n") + body
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func getInt(key string, fallback int) int {
	if val := os.Getenv(key); val != "" {
		n, err := strconv.Atoi(val)
		if err == nil {
			return n
		}
		log.Printf("Invalid int for %s, using fallback %d", key, fallback)
	}
	return fallback
}

func extractAddress(value string) string {
	start := strings.Index(value, "<")
	end := strings.Index(value, ">")
	if start >= 0 && end > start {
		return strings.TrimSpace(value[start+1 : end])
	}
	return strings.TrimSpace(value)
}

func loadEnv() {
	searchPaths := []string{
		".env",
		filepath.Join("..", ".env"),
		filepath.Join("..", "..", ".env"),
	}
	for _, p := range searchPaths {
		if _, err := os.Stat(p); err == nil {
			_ = godotenv.Overload(p)
			return
		}
	}
}
