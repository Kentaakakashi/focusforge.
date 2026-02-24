import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCSkxwMlyuany1HHOa_J-ETRClsCG0VCsc",
  authDomain: "focusforge-dpdx.firebaseapp.com",
  projectId: "focusforge-dpdx",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider };

