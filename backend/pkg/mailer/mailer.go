package mailer

import (
	"crypto/tls"
	"fmt"
	"log"
	"net/smtp"
	"strings"
)

// Mailer abstracts sending email notifications.
type Mailer interface {
	Send(to, subject, body string) error
}

func extractAddress(from string) string {
	start := strings.Index(from, "<")
	end := strings.Index(from, ">")
	if start >= 0 && end > start {
		return strings.TrimSpace(from[start+1 : end])
	}
	return strings.TrimSpace(from)
}

// Config holds SMTP configuration.
type Config struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
}

// New returns an SMTP-backed Mailer when configuration is complete,
// otherwise it falls back to a no-op mailer (useful for local dev without SMTP).
func New(cfg Config) Mailer {
	if cfg.Host == "" || cfg.Port == 0 || cfg.Username == "" || cfg.Password == "" || cfg.From == "" {
		return &noopMailer{}
	}
	return &smtpMailer{cfg: cfg}
}

type smtpMailer struct {
	cfg Config
}

func (m *smtpMailer) Send(to, subject, body string) error {
	addr := fmt.Sprintf("%s:%d", m.cfg.Host, m.cfg.Port)
	auth := smtp.PlainAuth("", m.cfg.Username, m.cfg.Password, m.cfg.Host)
	fromAddr := extractAddress(m.cfg.From)

	msg := buildMessage(m.cfg.From, to, subject, body)
	log.Printf("mailer: sending \"%s\" to %s", subject, to)

	if m.cfg.Port == 465 {
		return m.sendImplicitTLS(addr, auth, fromAddr, to, msg)
	}

	return smtp.SendMail(addr, auth, fromAddr, []string{to}, []byte(msg))
}

func (m *smtpMailer) sendImplicitTLS(addr string, auth smtp.Auth, from, to, msg string) error {
	tlsConfig := &tls.Config{ServerName: m.cfg.Host}
	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		return err
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, m.cfg.Host)
	if err != nil {
		return err
	}
	defer client.Quit()

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

type noopMailer struct{}

func (n *noopMailer) Send(string, string, string) error {
	return nil
}

func buildMessage(from, to, subject, body string) string {
	headers := []string{
		fmt.Sprintf("From: %s", from),
		fmt.Sprintf("To: %s", to),
		fmt.Sprintf("Subject: %s", subject),
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=\"UTF-8\"",
		"",
	}
	return strings.Join(headers, "\r\n") + body
}
