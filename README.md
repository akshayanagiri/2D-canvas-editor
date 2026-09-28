# 🎨 2D CanvasEditor — Interactive Canvas Application

A full-featured, responsive collaborative vector canvas built with **React**, **Fabric.js v6**, and **Firebase Firestore**.

This application enables users to create vector shapes, render freehand digital drawings, customize colors and stroke widths, manage undo/redo history, and export/save their artwork seamlessly.

---

## 🚀 Live Features

- 📐 **Vector Shape Creation:** Insert rectangles, circles, and customizable text objects into the canvas.
- ✏️ **Freehand Pen Tool:** Draw smoothly on the canvas with real-time controls for pen color and line thickness.
- ↩️ **Index-Based Undo & Redo Engine:** Step backward and forward through canvas edits reliably without losing rendering state or background colors.
- 🎨 **Canvas & Object Inspector:** Modify individual fill/stroke colors on selected objects or update the global canvas background dynamically.
- 💾 **Cloud Firestore Sync & Export:** Save canvas state directly to Firebase Firestore or export finished designs as high-resolution PNG images.

---

## 🛠️ Tech Stack

- **Frontend:** React.js, React Router v6
- **Canvas Library:** Fabric.js v6+
- **Backend / Database:** Firebase Firestore
- **Styling:** CSS3

---

## ⚙️ Getting Started & Local Setup

### 1. Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) v16 or higher
- npm

### 2. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Firebase

Create a `src/firebase.js` file and add your Firebase project credentials:

```javascript
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
```

> **Note:** For production applications, avoid committing sensitive configuration values directly to the repository. Consider using environment variables.

### 5. Run the Development Server

```bash
npm start
```

Open [http://localhost:5173](http://localhost:5173) in your browser to view the application.

---

## 📂 Project Structure

```text
src/
├── pages/
│   ├── Home.jsx               # Home page / landing page
│   └── CanvasEditor.jsx       # Primary canvas application logic & event listeners
├── firebase.js                # Firebase initialization & Firestore configuration
├── App.jsx                    # Routing and root entry component
└── index.css                  # Global canvas and UI layout styling
```

---

## 📝 License

This project is available for educational and personal use.
