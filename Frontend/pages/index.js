import { useState, useEffect, createContext, useContext } from 'react';

// The API URL is now configurable
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// --- Authentication Context ---
const AuthContext = createContext(null);
function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem('notes_app_token');
        const storedUser = localStorage.getItem('notes_app_user');
        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        // Use the API_URL
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Failed to login');
        }
        const data = await res.json();
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('notes_app_token', data.token);
        localStorage.setItem('notes_app_user', JSON.stringify(data.user));
    };
    const logout = () => { 
        setToken(null);
        setUser(null);
        localStorage.removeItem('notes_app_token');
        localStorage.removeItem('notes_app_user');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
const useAuth = () => useContext(AuthContext);


// --- UI Components ---
function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(email, password);
        } catch (err) {
            setError(err.message);
        }
    };
    
    const handleTestAccountClick = (testEmail) => {
        setEmail(testEmail);
        setPassword('password');
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h2 className="text-3xl font-extrabold text-center text-gray-900">Notes SaaS</h2>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email" className="text-sm font-medium text-gray-700">Email address</label>
                        <input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                        <label htmlFor="password"  className="text-sm font-medium text-gray-700">Password</label>
                        <input id="password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                     {error && <p className="text-sm text-red-600">{error}</p>}
                    <button type="submit" className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        Sign in
                    </button>
                </form>
                 <div className="text-center text-sm text-gray-500">
                    <p className="font-semibold mb-2">Test Accounts (password: `password`)</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <button onClick={() => handleTestAccountClick('admin@acme.test')} className="text-indigo-600 hover:underline">admin@acme.test</button>
                        <button onClick={() => handleTestAccountClick('user@acme.test')} className="text-indigo-600 hover:underline">user@acme.test</button>
                        <button onClick={() => handleTestAccountClick('admin@globex.test')} className="text-indigo-600 hover:underline">admin@globex.test</button>
                        <button onClick={() => handleTestAccountClick('user@globex.test')} className="text-indigo-600 hover:underline">user@globex.test</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function NotesPage() {
    const { user, token, logout } = useAuth();
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [error, setError] = useState('');
    const [showUpgrade, setShowUpgrade] = useState(false);

    const fetchNotes = async () => {
        const res = await fetch(`${API_URL}/api/notes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch notes');
        setNotes(await res.json());
    };

    useEffect(() => { if (token) fetchNotes(); }, [token]);

    const handleCreateNote = async (e) => {
        e.preventDefault();
        setError('');
        setShowUpgrade(false);
        const res = await fetch(`${API_URL}/api/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({ content: newNote })
        });
        if (res.status === 403) {
             setShowUpgrade(true);
             setError('Note limit reached for the Free plan.');
             return;
        }
        if (!res.ok) {
             const errData = await res.json();
             throw new Error(errData.message || 'Failed to create note');
        }
        setNewNote('');
        fetchNotes();
    };
    
    const handleDeleteNote = async (noteId) => {
        const res = await fetch(`${API_URL}/api/notes/${noteId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(!res.ok && res.status !== 204) throw new Error('Failed to delete note');
        fetchNotes();
        setShowUpgrade(false);
        setError('');
    };
    
    const handleUpgrade = async () => {
        const res = await fetch(`${API_URL}/api/tenants/${user.tenantSlug}/upgrade`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message);
        }
        alert('Upgrade successful! You now have unlimited notes.');
        setShowUpgrade(false);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex-shrink-0 font-bold text-xl text-indigo-600">
                           {user.tenantSlug.charAt(0).toUpperCase() + user.tenantSlug.slice(1)} Notes
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600">{user.email} ({user.role})</span>
                            <button onClick={logout} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Logout</button>
                        </div>
                    </div>
                </div>
            </nav>
            <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                 {error && <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">{error}</div>}
                 {showUpgrade && (
                    <div className="p-4 mb-4 text-sm text-blue-700 bg-blue-100 rounded-lg flex items-center justify-between">
                       <p><span className="font-medium">Limit Reached!</span> Upgrade to the Pro plan for unlimited notes.</p>
                       {user.role === 'Admin' && (
                           <button onClick={handleUpgrade} className="ml-4 whitespace-nowrap py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                               Upgrade to Pro
                           </button>
                       )}
                    </div>
                 )}
                <form onSubmit={handleCreateNote} className="mb-8">
                     <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Write a new note..." required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                     <button type="submit" className="mt-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Add Note</button>
                </form>
                
                <div className="space-y-4">
                    {notes.length > 0 ? notes.map(note => (
                        <div key={note._id} className="bg-white p-4 rounded-lg shadow flex justify-between items-start">
                            <p className="text-gray-800 whitespace-pre-wrap">{note.content}</p>
                            <button onClick={() => handleDeleteNote(note._id)} className="text-red-500 hover:text-red-700 text-sm font-medium ml-4">Delete</button>
                        </div>
                    )) : (
                        <p className="text-center text-gray-500">No notes yet. Create one above!</p>
                    )}
                </div>
            </main>
        </div>
    );
}

// --- Main App Component ---
export default function Home() {
    return ( <AuthProvider> <AppContent /> </AuthProvider> );
}
function AppContent() {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <NotesPage /> : <LoginPage />;
}