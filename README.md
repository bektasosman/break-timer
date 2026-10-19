# ⏱️ Break Timer (Spring Boot & Angular)

Full-Stack Fokus- & Pomodoro-App mit Echtzeit-Statistiken, Community-Insights, JWT-Authentifizierung und Event-Streaming.

---

## 🐳 Docker Setup (Images bauen)

Um Backend und Frontend als Docker-Images (z. B. für lokale Container oder Kubernetes) zu bauen, führe folgende Befehle vom Hauptverzeichnis aus:

### 1. Backend-Image bauen (Spring Boot + Java 21)
```bash
cd backend
docker build -t break-timer-backend:latest .
```

### 2. Frontend-Image bauen (Angular 22 + Nginx)
```bash
cd frontend
docker build -t break-timer-frontend:latest .
```

### 3. Gebaute Images prüfen
```bash
docker images
```

---

## 🚀 Lokale Entwicklung (ohne App-Container)

### Backend starten
```bash
cd backend
docker compose up -d   # Optional: Startet Kafka & Kafka-UI (Port 8085)
./mvnw spring-boot:run # Startet Spring Boot auf http://localhost:8080
```

### Frontend starten
```bash
cd frontend
npm install
ng serve               # Startet Angular auf http://localhost:4200
```

