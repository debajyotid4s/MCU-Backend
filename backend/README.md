# ESP32 Voice Assistant Backend

A serverless Node.js backend for ESP32-based voice assistant, powered by Google Gemini AI and Firebase Realtime Database. Deployed on Vercel.

## Architecture

```
┌─────────────┐     HTTP POST      ┌──────────────────┐
│   ESP32     │ ──────────────────→│  POST /api/query │
│   Device    │                    │                  │
└─────────────┘                    └────────┬─────────┘
      │                                     │
      │                                     ▼
      │                            ┌──────────────────┐
      │                            │  Gemini AI API   │
      │                            │  (HTTP Request)  │
      │                            └────────┬─────────┘
      │                                     │
      │                                     ▼
      │                            ┌──────────────────┐
      │                            │ Firebase RTDB    │
      │                            │ /responses/{id}  │
      │                            └────────┬─────────┘
      │                                     │
      │        HTTP GET                     │
      │ ←──────────────────────────────────┘
      │     GET /api/response?request_id=xxx
      │
      │        HTTP DELETE
      │ ────────────────────────────────────→
            DELETE /api/response?request_id=xxx
```

## Project Structure

```
backend/
├── api/
│   ├── query.js          # POST: ESP32 sends query
│   └── response.js       # GET/DELETE: ESP32 polls response
├── config/
│   ├── firebase.js       # Firebase Admin SDK initialization
│   └── gemini.js         # Google Gemini AI configuration
├── services/
│   ├── geminiService.js  # Gemini request logic
│   └── dbService.js      # Firebase CRUD operations
├── utils/
│   ├── validator.js      # Request validation
│   └── constants.js      # Status strings, limits
├── package.json
├── vercel.json
└── README.md
```

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Variables

Create a `.env` file in the project root (or configure in Vercel dashboard):

```env
# Firebase Configuration (from Service Account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com

# Gemini API Configuration
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Enable **Realtime Database**
4. Set database rules:
   ```json
   {
     "rules": {
       "responses": {
         "$request_id": {
           ".read": true,
           ".write": true
         }
       }
     }
   }
   ```
5. Go to Project Settings → Service Accounts
6. Click "Generate new private key"
7. Copy values to your `.env` file

### 4. Gemini API Setup

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy to `GEMINI_API_KEY` in `.env`

### 5. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd backend
vercel --prod
```

## API Reference

### POST /api/query

Send a query from ESP32 to be processed by Gemini AI.

**Request:**
```json
{
  "request_id": "esp32-001-1702656000",
  "text": "What is the weather like today?"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| request_id | string | Yes | Unique ID (alphanumeric, -, _), max 64 chars |
| text | string | Yes | Query text, max 1000 chars |

**Response (Success):**
```json
{
  "success": true,
  "request_id": "esp32-001-1702656000",
  "message": "Query processed successfully"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "request_id is required"
}
```

---

### GET /api/response

Poll for AI response by request_id.

**Request:**
```
GET /api/response?request_id=esp32-001-1702656000
```

**Response (Pending):**
```json
{
  "success": true,
  "request_id": "esp32-001-1702656000",
  "status": "pending",
  "message": "Response is still being processed"
}
```

**Response (Completed):**
```json
{
  "success": true,
  "request_id": "esp32-001-1702656000",
  "status": "completed",
  "text": "I don't have access to real-time weather data, but you can check your local weather app!",
  "timestamp": 1702656000000
}
```

**Response (Not Found):**
```json
{
  "success": false,
  "request_id": "esp32-001-1702656000",
  "status": "not_found",
  "message": "No response found for this request_id"
}
```

---

### DELETE /api/response

Delete response after ESP32 has retrieved it (cleanup).

**Request:**
```
DELETE /api/response?request_id=esp32-001-1702656000
```

**Response:**
```json
{
  "success": true,
  "request_id": "esp32-001-1702656000",
  "message": "Response deleted successfully"
}
```

## ESP32 Integration Example

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* BACKEND_URL = "https://your-app.vercel.app";
String currentRequestId = "";

// Generate unique request ID
String generateRequestId() {
  return "esp32-" + String(millis());
}

// Send query to backend
bool sendQuery(const char* text) {
  HTTPClient http;
  http.begin(String(BACKEND_URL) + "/api/query");
  http.addHeader("Content-Type", "application/json");
  
  currentRequestId = generateRequestId();
  
  StaticJsonDocument<256> doc;
  doc["request_id"] = currentRequestId;
  doc["text"] = text;
  
  String json;
  serializeJson(doc, json);
  
  int httpCode = http.POST(json);
  http.end();
  
  return httpCode == 200;
}

// Poll for response
String pollResponse() {
  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/response?request_id=" + currentRequestId;
  http.begin(url);
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    StaticJsonDocument<1024> doc;
    deserializeJson(doc, payload);
    
    const char* status = doc["status"];
    
    if (strcmp(status, "completed") == 0) {
      String text = doc["text"].as<String>();
      http.end();
      
      // Clean up
      deleteResponse();
      
      return text;
    }
  }
  
  http.end();
  return "";
}

// Delete response after reading
void deleteResponse() {
  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/response?request_id=" + currentRequestId;
  http.begin(url);
  http.sendRequest("DELETE");
  http.end();
}
```

## Firebase Database Structure

```
/responses
  /{request_id}
    - text: string          // AI response text
    - status: string        // "pending" | "completed" | "error"
    - timestamp: number     // Unix timestamp
    - consumed: boolean     // Whether ESP32 read it
```

## Limits & Constraints

| Constraint | Value |
|------------|-------|
| Max query length | 1000 characters |
| Max response length | 1000 characters |
| Max request_id length | 64 characters |
| Gemini timeout | 25 seconds |
| Vercel function timeout | 10s (hobby) / 60s (pro) |

## Error Handling

The backend handles these error scenarios:
- Invalid/missing request_id
- Empty or too-long query text
- Gemini API timeout
- Gemini rate limits
- Firebase connection errors
- Invalid HTTP methods

## Security Notes

1. **Never expose API keys** - All keys are in environment variables
2. **ESP32 doesn't access Gemini/Firebase directly** - Backend is the secure proxy
3. **Validate all inputs** - request_id and text are sanitized
4. **Use HTTPS** - Vercel provides SSL automatically

## Local Development

```bash
# Install Vercel CLI
npm install -g vercel

# Run locally
cd backend
vercel dev
```

## License

MIT
