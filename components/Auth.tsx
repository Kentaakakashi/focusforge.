
import React, { useState } from 'react';
import { auth, googleProvider } from '../firebaseClient';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendSignInLinkToEmail
} from 'firebase/auth';

const BrutalistInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className="w-full p-4 text-lg bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg focus:outline-none focus:ring-4 focus:ring-electric-blue"
  />
);

const BrutalistButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { color?: 'blue' | 'purple' }> = ({ children, color = 'blue', ...props }) => (
  <button
    {...props}
    className={`w-full text-white font-grotesk font-bold text-2xl p-4 border-4 border-black dark:border-white rounded-lg transition-all duration-200 hover:bg-opacity-80 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] dark:hover:shadow-[6px_6px_0px_#FFF] active:translate-y-0 active:shadow-hard dark:active:shadow-hard-dark ${color === 'blue' ? 'bg-electric-blue' : 'bg-neon-purple'}`}
  >
    {children}
  </button>
);

interface LoginViewProps {
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  error: string | null;
  setError: (val: string | null) => void;
  setAuthView: (view: 'login' | 'signup') => void;
  onGoogleSignIn: () => void;
  onMagicLinkSignIn: () => void;
  magicLinkSent: boolean;
}

const LoginView: React.FC<LoginViewProps> = ({ email, setEmail, password, setPassword, error, setError, setAuthView, onGoogleSignIn, onMagicLinkSignIn, magicLinkSent }) => (
  <>
    <h1 className="text-4xl md:text-5xl font-grotesk font-bold mb-2">Welcome back,</h1>
    <h2 className="text-4xl md:text-5xl font-grotesk font-bold text-electric-blue mb-8">Studier.</h2>

    {magicLinkSent ? (
      <div className="p-6 bg-acid-green bg-opacity-10 border-4 border-acid-green rounded-lg text-acid-green font-bold text-center">
        Magic Link sent! Check your email to sign in.
      </div>
    ) : (
      <div className="space-y-4">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            try {
              await signInWithEmailAndPassword(auth, email, password);
            } catch (err) {
              setError('Unable to log in. Check your credentials.');
            }
          }}
        >
          <BrutalistInput
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <BrutalistInput
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <BrutalistButton type="submit">LOGIN WITH PASSWORD</BrutalistButton>
        </form>

        <div className="flex items-center gap-4 my-6">
          <div className="flex-grow h-1 bg-black dark:bg-white"></div>
          <span className="font-bold">OR</span>
          <div className="flex-grow h-1 bg-black dark:bg-white"></div>
        </div>

        <button
          onClick={onGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 p-4 bg-white dark:bg-gray-800 border-4 border-black dark:border-white rounded-lg font-bold text-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:-translate-y-1 shadow-hard dark:shadow-hard-dark"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          CONTINUE WITH GOOGLE
        </button>

        <button
          onClick={onMagicLinkSignIn}
          className="w-full p-4 bg-neon-purple text-white border-4 border-black dark:border-white rounded-lg font-bold text-xl hover:bg-opacity-80 transition-all hover:-translate-y-1 shadow-hard dark:shadow-hard-dark"
        >
          EMAIL ME A MAGIC LINK
        </button>
      </div>
    )}

    <p className="text-center mt-6">
      Don't have an account?{' '}
      <button onClick={() => setAuthView('signup')} className="font-bold text-electric-blue hover:underline">Sign Up</button>
    </p>
  </>
);

interface SignupViewProps {
  signupEmail: string;
  setSignupEmail: (val: string) => void;
  signupPassword: string;
  setSignupPassword: (val: string) => void;
  signupUsername: string;
  setSignupUsername: (val: string) => void;
  error: string | null;
  setError: (val: string | null) => void;
  setAuthView: (view: 'login' | 'signup') => void;
}

const SignupView: React.FC<SignupViewProps> = ({ signupEmail, setSignupEmail, signupPassword, setSignupPassword, signupUsername, setSignupUsername, error, setError, setAuthView }) => (
  <>
    <h1 className="text-4xl md:text-5xl font-grotesk font-bold mb-2">Create your</h1>
    <h2 className="text-4xl md:text-5xl font-grotesk font-bold text-neon-purple mb-8">Account.</h2>
    <form
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        try {
          await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);
        } catch (err) {
          setError('Unable to create account. Try a different email or password.');
        }
      }}
    >
      <BrutalistInput
        type="text"
        placeholder="Username"
        required
        value={signupUsername}
        onChange={e => setSignupUsername(e.target.value)}
      />
      <BrutalistInput
        type="email"
        placeholder="Email Address"
        required
        value={signupEmail}
        onChange={e => setSignupEmail(e.target.value)}
      />
      <BrutalistInput
        type="password"
        placeholder="Password"
        required
        value={signupPassword}
        onChange={e => setSignupPassword(e.target.value)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <BrutalistButton type="submit" color="purple">CREATE ACCOUNT</BrutalistButton>
    </form>
    <p className="text-center mt-6">
      Already have an account?{' '}
      <button onClick={() => setAuthView('login')} className="font-bold text-neon-purple hover:underline">Log In</button>
    </p>
  </>
);

const Auth: React.FC = () => {
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message || 'Google sign in failed');
    }
  };

  const handleMagicLinkSignIn = async () => {
    if (!email) {
      setError('Please enter your email first.');
      return;
    }
    setError(null);
    try {
      const actionCodeSettings = {
        url: window.location.origin,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setMagicLinkSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link');
    }
  };

  const renderView = () => {
    switch (authView) {
      case 'login': return (
        <LoginView
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          error={error}
          setError={setError}
          setAuthView={setAuthView}
          onGoogleSignIn={handleGoogleSignIn}
          onMagicLinkSignIn={handleMagicLinkSignIn}
          magicLinkSent={magicLinkSent}
        />
      );
      case 'signup': return (
        <SignupView
          signupEmail={signupEmail}
          setSignupEmail={setSignupEmail}
          signupPassword={signupPassword}
          setSignupPassword={setSignupPassword}
          signupUsername={signupUsername}
          setSignupUsername={setSignupUsername}
          error={error}
          setError={setError}
          setAuthView={setAuthView}
        />
      );
      default: return (
        <LoginView
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          error={error}
          setError={setError}
          setAuthView={setAuthView}
          onGoogleSignIn={handleGoogleSignIn}
          onMagicLinkSignIn={handleMagicLinkSignIn}
          magicLinkSent={magicLinkSent}
        />
      );
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center font-sans bg-dark-bg text-white p-4">
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 border-4 border-black dark:border-white shadow-hard dark:shadow-hard-dark rounded-lg">
        {renderView()}
      </div>
    </div>
  );
};

export default Auth;
