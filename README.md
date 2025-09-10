# WPS 3.0

WPS 3.0 is a web-based application designed for managing and participating in poker games. It provides a comprehensive suite of tools for administrators to manage users and game rooms, and for players to join games, manage their accounts, and interact with each other. The application is built using HTML, Tailwind CSS, and vanilla JavaScript, with Firebase and Firestore as the backend for authentication and database management.

## Project Structure

The repository is organized into several key files and directories:

-   `index.html`: The main application file. This is the entry point for the primary version of the application and contains the core HTML, CSS, and JavaScript logic.
-   `beta/`: This directory contains a beta version of the application, which is a duplicate of the main `index.html`. It may be used for testing new features before they are deployed to the main application.
-   `sidepot/`: This directory contains a version of the application specifically for managing side pots. It is also a duplicate of the main `index.html` but connects to a separate Firestore database named `sidepot`.
-   `stats/`: This directory contains an `index.html` file that embeds Google Sheets charts to display game statistics.

## Features

### User Management
-   **Google Authentication:** Users can sign in with their Google accounts.
-   **Role-Based Access Control:** The system supports different user roles, including `player`, `admin`, and `owner`. Administrators have access to an admin panel to manage the application.
-   **User Directory:** All users can view a directory of registered users and their online status.
-   **Account Management:** Users can manage their account details, including linking their accounts with Google.

### Game Management
-   **Game Rooms:** Administrators can create, manage, and delete game rooms.
-   **Joining Games:** Players can join available game rooms to participate in games.
-   **In-Game Actions:** Players can perform standard poker actions such as placing bets, calling, folding, and going all-in.
-   **Chip Management:** Administrators can update player chip counts and reset the room state.

### Investment Platform
-   **Shares and Offers:** The application includes a sophisticated investment platform where users can offer and accept investment deals with other players.
-   **Investment Tracking:** Users can track their active and pending investments, as well as view their investment history.

## Setup and Usage

To run this project locally, you will need a web browser and an internet connection.

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    ```
2.  **Open the `index.html` file:**
    Navigate to the project directory and open the `index.html` file in your web browser.

    ```bash
    cd <repository-directory>
    # Open index.html in your browser
    ```

### Firebase Configuration

The application is configured to use a specific Firebase project. The Firebase configuration details are included in the `<script>` tag of each `index.html` file. If you want to use your own Firebase project, you will need to replace the existing configuration with your own.

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};
```

You will also need to set up Firebase Authentication (with Google provider enabled) and Firestore for your project.
