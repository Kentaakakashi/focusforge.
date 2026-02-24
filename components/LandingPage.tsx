
import React from 'react';
import { TimerIcon, TasksIcon, CommunityIcon, MusicIcon, FriendsIcon } from './icons/Icons';

interface LandingPageProps {
    onNavigateToAuth: () => void;
}

const WebsiteStatus = () => {
    // This can be driven by a prop or API call in a real app
    const status = 'limited'; // 'public', 'limited', 'restricted'

    const statusInfo = {
        public: { text: "Public Access: All new registrations are open.", color: "bg-acid-green", textColor: "text-black" },
        limited: { text: "Invite Only: A valid referral is required for new registrations.", color: "bg-status-orange", textColor: "text-black" },
        restricted: { text: "Restricted Access: New registrations are temporarily closed.", color: "bg-bright-red", textColor: "text-white" },
    }[status];

    return (
        <div className={`p-2 text-center font-bold font-mono text-sm ${statusInfo.color} ${statusInfo.textColor}`}>
            {statusInfo.text}
        </div>
    );
};


const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToAuth }) => {

    const BrutalistButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {variant: 'primary' | 'secondary'}> = ({ children, variant, ...props }) => (
        <button {...props} className={`font-grotesk font-bold text-xl p-4 border-4 border-white rounded-lg transition-all duration-200 hover:-translate-y-1 active:translate-y-0 active:shadow-hard-dark shadow-[6px_6px_0px_#FFF] ${variant === 'primary' ? 'bg-electric-blue text-white' : 'bg-dark-bg text-white'}`}>
            {children}
        </button>
    );

    const FeatureCard: React.FC<{icon: React.ElementType, title: string, description: string}> = ({icon: Icon, title, description}) => (
        <div className="p-6 bg-gray-800 border-4 border-white rounded-lg shadow-hard-dark">
            <Icon className="w-10 h-10 mb-4 text-neon-purple"/>
            <h3 className="text-2xl font-grotesk font-bold">{title}</h3>
            <p className="mt-2 text-gray-400">{description}</p>
        </div>
    );
    
    return (
        <div className="bg-dark-bg text-white font-sans">
            <header className="p-4 border-b-4 border-white sticky top-0 bg-dark-bg z-10">
                <nav className="container mx-auto flex justify-between items-center">
                    <h1 className="font-grotesk text-3xl font-bold">FocusForge</h1>
                    <div className="flex items-center gap-4">
                        <button onClick={onNavigateToAuth} className="font-bold font-grotesk text-lg">Login</button>
                        <BrutalistButton onClick={onNavigateToAuth} variant="primary">Start Studying</BrutalistButton>
                    </div>
                </nav>
            </header>
            <WebsiteStatus />
            <main>
                {/* Hero Section */}
                <section className="py-20 md:py-32 text-center border-b-4 border-white">
                    <div className="container mx-auto px-4">
                        <h1 className="text-5xl md:text-7xl font-grotesk font-bold">Study Smarter,</h1>
                        <h2 className="text-5xl md:text-7xl font-grotesk font-bold text-electric-blue">Not Harder.</h2>
                        <p className="mt-6 text-xl max-w-2xl mx-auto text-gray-300">The all-in-one productivity app for students, designed with a no-nonsense, bold neobrutalist vibe. Track your focus, manage tasks, and grow with the community.</p>
                        <div className="mt-10 flex justify-center gap-4">
                            <BrutalistButton onClick={onNavigateToAuth} variant="primary">Join for Free</BrutalistButton>
                            <BrutalistButton onClick={onNavigateToAuth} variant="secondary">Login</BrutalistButton>
                        </div>
                    </div>
                </section>
                
                {/* Features Section */}
                <section className="py-20 bg-black border-b-4 border-white">
                    <div className="container mx-auto px-4">
                        <h2 className="text-4xl font-grotesk font-bold text-center mb-12">Everything a Student Needs</h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <FeatureCard icon={TimerIcon} title="Focus Timer" description="A minimal Pomodoro timer to keep you locked in and productive."/>
                            <FeatureCard icon={TasksIcon} title="Task Planner" description="Organize your assignments and projects with a brutalist-style task board."/>
                            <FeatureCard icon={CommunityIcon} title="Community Ideas" description="Suggest and vote on new features. This platform is built for you, by you."/>
                            <FeatureCard icon={MusicIcon} title="Study Music" description="Integrate your music to automatically play focus playlists during sessions."/>
                            <FeatureCard icon={FriendsIcon} title="Study with Friends" description="Invite friends to study sessions and keep each other accountable."/>
                             <div className="p-6 bg-neon-purple text-white border-4 border-white rounded-lg shadow-hard-dark">
                                <h3 className="text-2xl font-grotesk font-bold">And much more...</h3>
                                <p className="mt-2">Analytics, themes, advanced settings, and more to come!</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <footer className="p-8 text-center bg-gray-800 border-t-4 border-white">
                <p className="font-bold">&copy; 2024 FocusForge. For Students, By Students.</p>
            </footer>
        </div>
    );
};

export default LandingPage;
