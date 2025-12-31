const { useState, useEffect, useCallback, useRef, createElement: h } = React;

// API Configuration
const API_BASE = '';

// API Helper
const api = {
  token: localStorage.getItem('token'),
  
  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  },
  
  async request(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await res.json();
    
    if (!res.ok) {
      if (res.status === 401) {
        this.setToken(null);
        window.location.reload();
      }
      throw new Error(data.error || 'Błąd serwera');
    }
    return data;
  },
  
  get: (url) => api.request(url),
  post: (url, body) => api.request(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) => api.request(url, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (url) => api.request(url, { method: 'DELETE' })
};

// Icons
const Icons = {
  check: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
    h('polyline', { points: '20 6 9 17 4 12' })),
  plus: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
    h('line', { x1: 12, y1: 5, x2: 12, y2: 19 }),
    h('line', { x1: 5, y1: 12, x2: 19, y2: 12 })),
  trash: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
    h('polyline', { points: '3 6 5 6 21 6' }),
    h('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' })),
  list: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
    h('line', { x1: 8, y1: 6, x2: 21, y2: 6 }),
    h('line', { x1: 8, y1: 12, x2: 21, y2: 12 }),
    h('line', { x1: 8, y1: 18, x2: 21, y2: 18 }),
    h('line', { x1: 3, y1: 6, x2: 3.01, y2: 6 }),
    h('line', { x1: 3, y1: 12, x2: 3.01, y2: 12 }),
    h('line', { x1: 3, y1: 18, x2: 3.01, y2: 18 })),
  chart: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
    h('line', { x1: 18, y1: 20, x2: 18, y2: 10 }),
    h('line', { x1: 12, y1: 20, x2: 12, y2: 4 }),
    h('line', { x1: 6, y1: 20, x2: 6, y2: 14 })),
  user: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
    h('path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }),
    h('circle', { cx: 12, cy: 7, r: 4 })),
  users: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
    h('path', { d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' }),
    h('circle', { cx: 9, cy: 7, r: 4 }),
    h('path', { d: 'M23 21v-2a4 4 0 0 0-3-3.87' }),
    h('path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' })),
  folder: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
    h('path', { d: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' })),
  settings: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
    h('circle', { cx: 12, cy: 12, r: 3 }),
    h('path', { d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z' })),
  back: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
    h('line', { x1: 19, y1: 12, x2: 5, y2: 12 }),
    h('polyline', { points: '12 19 5 12 12 5' })),
  logout: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
    h('path', { d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' }),
    h('polyline', { points: '16 17 21 12 16 7' }),
    h('line', { x1: 21, y1: 12, x2: 9, y2: 12 })),
  share: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
    h('circle', { cx: 18, cy: 5, r: 3 }),
    h('circle', { cx: 6, cy: 12, r: 3 }),
    h('circle', { cx: 18, cy: 19, r: 3 }),
    h('line', { x1: 8.59, y1: 13.51, x2: 15.42, y2: 17.49 }),
    h('line', { x1: 15.41, y1: 6.51, x2: 8.59, y2: 10.49 })),
  x: h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
    h('line', { x1: 18, y1: 6, x2: 6, y2: 18 }),
    h('line', { x1: 6, y1: 6, x2: 18, y2: 18 }))
};

// Toast Component
function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, []);
  return h('div', { className: 'toast' }, message);
}

// useToast Hook
function useToast() {
  const [toast, setToast] = useState(null);
  const showToast = (message) => setToast(message);
  const ToastComponent = toast ? h(Toast, { message: toast, onClose: () => setToast(null) }) : null;
  return [showToast, ToastComponent];
}

// Modal Component
function Modal({ title, onClose, children }) {
  return h('div', { className: 'modal-overlay', onClick: onClose },
    h('div', { className: 'modal', onClick: e => e.stopPropagation() },
      h('div', { className: 'modal-header' },
        h('h3', null, title),
        h('button', { className: 'btn btn-icon', onClick: onClose }, Icons.x)),
      h('div', { className: 'modal-body' }, children)));
}

// Login Component
function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      if (isRegister) {
        await api.post('/api/auth/register', { email, password, name });
        setSuccess('Konto utworzone! Oczekuj na zatwierdzenie przez administratora.');
        setIsRegister(false);
      } else {
        const data = await api.post('/api/auth/login', { email, password });
        api.setToken(data.token);
        onLogin(data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return h('div', { className: 'app' },
    h('div', { className: 'main', style: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' } },
      h('div', { className: 'card', style: { width: '100%', maxWidth: '400px' } },
        h('div', { className: 'card-header' },
          h('h2', null, isRegister ? 'Rejestracja' : 'Logowanie')),
        h('div', { className: 'card-body' },
          h('form', { onSubmit: handleSubmit },
            isRegister && h('div', { className: 'form-group' },
              h('label', { className: 'form-label' }, 'Imię'),
              h('input', { 
                className: 'form-input', 
                type: 'text', 
                value: name, 
                onChange: e => setName(e.target.value),
                required: true 
              })),
            h('div', { className: 'form-group' },
              h('label', { className: 'form-label' }, 'Email'),
              h('input', { 
                className: 'form-input', 
                type: 'email', 
                value: email, 
                onChange: e => setEmail(e.target.value),
                required: true 
              })),
            h('div', { className: 'form-group' },
              h('label', { className: 'form-label' }, 'Hasło'),
              h('input', { 
                className: 'form-input', 
                type: 'password', 
                value: password, 
                onChange: e => setPassword(e.target.value),
                required: true,
                minLength: 6 
              })),
            error && h('div', { style: { color: 'var(--danger)', marginBottom: '1rem' } }, error),
            success && h('div', { style: { color: 'var(--success)', marginBottom: '1rem' } }, success),
            h('button', { 
              className: 'btn btn-primary btn-block', 
              type: 'submit',
              disabled: loading 
            }, loading ? 'Ładowanie...' : (isRegister ? 'Zarejestruj' : 'Zaloguj')),
            h('button', { 
              className: 'btn btn-outline btn-block mt-2', 
              type: 'button',
              onClick: () => { setIsRegister(!isRegister); setError(''); setSuccess(''); }
            }, isRegister ? 'Mam już konto' : 'Utwórz konto'))))));
}

// Profiles List
function ProfilesList({ user, onSelect, onCreateNew, onManageGroups }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(null);
  const [showToast, ToastComponent] = useToast();
  
  const loadProfiles = useCallback(() => {
    api.get('/api/profiles').then(setProfiles).finally(() => setLoading(false));
  }, []);
  
  useEffect(() => { loadProfiles(); }, [loadProfiles]);
  
  if (loading) return h('div', { className: 'loading' }, h('div', { className: 'spinner' }), 'Ładowanie...');
  
  return h('div', null,
    h('div', { className: 'flex-between mb-2' },
      h('h2', null, 'Profile zakupowe'),
      h('div', { className: 'flex gap-1' },
        h('button', { className: 'btn btn-outline btn-sm', onClick: onManageGroups }, Icons.users, ' Grupy'),
        h('button', { className: 'btn btn-primary btn-sm', onClick: onCreateNew }, Icons.plus, ' Nowy'))),
    profiles.length === 0 
      ? h('div', { className: 'empty-state' },
          Icons.folder,
          h('p', null, 'Nie masz jeszcze żadnych profili'),
          h('button', { className: 'btn btn-primary mt-2', onClick: onCreateNew }, 'Utwórz pierwszy profil'))
      : profiles.map(p => h('div', { 
          key: p.id, 
          className: 'card mb-1'
        },
          h('div', { className: 'card-body flex-between' },
            h('div', { 
              style: { flex: 1, cursor: 'pointer' },
              onClick: () => onSelect(p)
            },
              h('strong', null, p.name),
              p.description && h('p', { className: 'text-sm text-muted' }, p.description),
              p.group_name && h('span', { className: 'badge badge-primary text-sm' }, `Grupa: ${p.group_name}`)),
            h('div', { className: 'flex gap-1' },
              h('button', { 
                className: 'btn btn-icon btn-sm',
                onClick: (e) => { e.stopPropagation(); setShowShareModal(p); },
                title: 'Udostępnij'
              }, Icons.share))))),
    
    showShareModal && h(ShareProfileModal, {
      profile: showShareModal,
      onClose: () => setShowShareModal(null),
      onShared: () => { loadProfiles(); showToast('Udostępniono profil'); }
    }),
    
    ToastComponent);
}

// Share Profile Modal
function ShareProfileModal({ profile, onClose, onShared }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    api.get('/api/auth/groups').then(setGroups).finally(() => setLoading(false));
  }, []);
  
  const handleShare = async () => {
    if (!selectedGroup) return;
    setSaving(true);
    setError('');
    try {
      await api.put(`/api/profiles/${profile.id}`, { groupId: selectedGroup });
      onShared();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  
  const handleUnshare = async () => {
    setSaving(true);
    try {
      await api.put(`/api/profiles/${profile.id}`, { groupId: null });
      onShared();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  
  return h(Modal, { title: `Udostępnij: ${profile.name}`, onClose },
    loading 
      ? h('div', { className: 'loading' }, h('div', { className: 'spinner' }))
      : h('div', null,
          profile.group_id && h('div', { className: 'mb-2', style: { padding: '0.75rem', background: 'var(--bg)', borderRadius: '0.5rem' } },
            h('p', { className: 'text-sm' }, 'Profil jest udostępniony grupie: ', h('strong', null, profile.group_name)),
            h('button', { 
              className: 'btn btn-outline btn-sm mt-1',
              onClick: handleUnshare,
              disabled: saving
            }, 'Cofnij udostępnienie')),
          
          groups.length === 0
            ? h('p', { className: 'text-muted' }, 'Nie masz żadnych grup. Utwórz grupę, aby móc udostępniać profile.')
            : h('div', null,
                h('label', { className: 'form-label' }, 'Wybierz grupę'),
                h('select', {
                  className: 'form-input',
                  value: selectedGroup,
                  onChange: e => setSelectedGroup(e.target.value)
                },
                  h('option', { value: '' }, '-- Wybierz grupę --'),
                  groups.map(g => h('option', { key: g.id, value: g.id }, g.name))),
                
                error && h('div', { style: { color: 'var(--danger)', marginTop: '0.5rem' } }, error),
                
                h('button', {
                  className: 'btn btn-primary btn-block mt-2',
                  onClick: handleShare,
                  disabled: !selectedGroup || saving
                }, saving ? 'Udostępnianie...' : 'Udostępnij grupie'))));
}

// Groups Management
function GroupsManagement({ onBack }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showToast, ToastComponent] = useToast();
  
  const loadGroups = useCallback(() => {
    api.get('/api/auth/groups').then(setGroups).finally(() => setLoading(false));
  }, []);
  
  useEffect(() => { loadGroups(); }, [loadGroups]);
  
  if (loading) return h('div', { className: 'loading' }, h('div', { className: 'spinner' }));
  
  if (selectedGroup) {
    return h(GroupDetail, {
      group: selectedGroup,
      onBack: () => { setSelectedGroup(null); loadGroups(); },
      showToast
    });
  }
  
  return h('div', null,
    h('div', { className: 'flex-between mb-2' },
      h('div', { className: 'flex gap-1', style: { alignItems: 'center' } },
        h('button', { className: 'btn btn-icon btn-outline', onClick: onBack }, Icons.back),
        h('h2', null, 'Grupy')),
      h('button', { className: 'btn btn-primary btn-sm', onClick: () => setShowCreate(true) }, Icons.plus, ' Nowa')),
    
    showCreate && h(CreateGroupForm, {
      onCreated: () => { setShowCreate(false); loadGroups(); showToast('Grupa utworzona'); },
      onCancel: () => setShowCreate(false)
    }),
    
    groups.length === 0
      ? h('div', { className: 'empty-state' },
          Icons.users,
          h('p', null, 'Nie masz jeszcze żadnych grup'),
          h('button', { className: 'btn btn-primary mt-2', onClick: () => setShowCreate(true) }, 'Utwórz pierwszą grupę'))
      : groups.map(g => h('div', {
          key: g.id,
          className: 'card mb-1',
          onClick: () => setSelectedGroup(g),
          style: { cursor: 'pointer' }
        },
          h('div', { className: 'card-body flex-between' },
            h('div', null,
              h('strong', null, g.name),
              g.description && h('p', { className: 'text-sm text-muted' }, g.description)),
            h('span', { className: 'badge badge-primary' }, g.user_role)))),
    
    ToastComponent);
}

// Create Group Form
function CreateGroupForm({ onCreated, onCancel }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/api/auth/groups', { name, description });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return h('div', { className: 'card mb-2' },
    h('div', { className: 'card-header' },
      h('strong', null, 'Nowa grupa'),
      h('button', { className: 'btn btn-sm btn-outline', onClick: onCancel }, 'Anuluj')),
    h('div', { className: 'card-body' },
      h('form', { onSubmit: handleSubmit },
        h('div', { className: 'form-group' },
          h('input', {
            className: 'form-input',
            placeholder: 'Nazwa grupy',
            value: name,
            onChange: e => setName(e.target.value),
            required: true
          })),
        h('div', { className: 'form-group' },
          h('input', {
            className: 'form-input',
            placeholder: 'Opis (opcjonalnie)',
            value: description,
            onChange: e => setDescription(e.target.value)
          })),
        error && h('div', { style: { color: 'var(--danger)', marginBottom: '0.5rem' } }, error),
        h('button', { className: 'btn btn-primary', disabled: loading },
          loading ? 'Tworzenie...' : 'Utwórz grupę'))));
}

// Group Detail
function GroupDetail({ group, onBack, showToast }) {
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [adding, setAdding] = useState(false);
  
  const loadMembers = useCallback(() => {
    api.get(`/api/auth/groups/${group.id}/members`).then(setMembers).finally(() => setLoading(false));
  }, [group.id]);
  
  useEffect(() => { loadMembers(); }, [loadMembers]);
  
  const loadAllUsers = async () => {
    try {
      const users = await api.get('/api/auth/users');
      setAllUsers(users.filter(u => !members.find(m => m.id === u.id)));
    } catch (err) {
      setAllUsers([]);
    }
  };
  
  const handleAddMember = async () => {
    if (!selectedUser) return;
    setAdding(true);
    try {
      await api.post(`/api/auth/groups/${group.id}/members`, { userId: selectedUser, role: memberRole });
      showToast('Dodano do grupy');
      setShowAddMember(false);
      setSelectedUser('');
      loadMembers();
    } catch (err) {
      showToast('Błąd: ' + err.message);
    } finally {
      setAdding(false);
    }
  };
  
  const removeMember = async (userId) => {
    if (!confirm('Usunąć użytkownika z grupy?')) return;
    try {
      await api.delete(`/api/auth/groups/${group.id}/members/${userId}`);
      showToast('Usunięto z grupy');
      loadMembers();
    } catch (err) {
      showToast('Błąd: ' + err.message);
    }
  };
  
  const canManage = group.user_role === 'owner' || group.user_role === 'admin';
  
  return h('div', null,
    h('div', { className: 'flex-between mb-2' },
      h('div', { className: 'flex gap-1', style: { alignItems: 'center' } },
        h('button', { className: 'btn btn-icon btn-outline', onClick: onBack }, Icons.back),
        h('div', null,
          h('h2', null, group.name),
          group.description && h('p', { className: 'text-sm text-muted' }, group.description))),
      canManage && h('button', { 
        className: 'btn btn-primary btn-sm',
        onClick: () => { setShowAddMember(true); loadAllUsers(); }
      }, Icons.plus, ' Dodaj')),
    
    showAddMember && h('div', { className: 'card mb-2' },
      h('div', { className: 'card-header' },
        h('strong', null, 'Dodaj członka'),
        h('button', { className: 'btn btn-sm btn-outline', onClick: () => setShowAddMember(false) }, 'Anuluj')),
      h('div', { className: 'card-body' },
        allUsers.length === 0
          ? h('p', { className: 'text-muted' }, 'Brak dostępnych użytkowników do dodania')
          : h('div', null,
              h('div', { className: 'form-group' },
                h('label', { className: 'form-label' }, 'Użytkownik'),
                h('select', {
                  className: 'form-input',
                  value: selectedUser,
                  onChange: e => setSelectedUser(e.target.value)
                },
                  h('option', { value: '' }, '-- Wybierz --'),
                  allUsers.map(u => h('option', { key: u.id, value: u.id }, `${u.name} (${u.email})`)))),
              h('div', { className: 'form-group' },
                h('label', { className: 'form-label' }, 'Rola'),
                h('select', {
                  className: 'form-input',
                  value: memberRole,
                  onChange: e => setMemberRole(e.target.value)
                },
                  h('option', { value: 'member' }, 'Członek'),
                  h('option', { value: 'admin' }, 'Admin'))),
              h('button', {
                className: 'btn btn-primary',
                onClick: handleAddMember,
                disabled: !selectedUser || adding
              }, adding ? 'Dodawanie...' : 'Dodaj')))),
    
    loading
      ? h('div', { className: 'loading' }, h('div', { className: 'spinner' }))
      : h('div', { className: 'card' },
          h('div', { className: 'card-header' },
            h('strong', null, 'Członkowie'),
            h('span', { className: 'badge badge-primary' }, members.length)),
          h('div', { className: 'card-body' },
            members.map(m => h('div', {
              key: m.id,
              className: 'flex-between',
              style: { padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }
            },
              h('div', null,
                h('strong', null, m.name),
                h('div', { className: 'text-sm text-muted' }, m.email)),
              h('div', { className: 'flex gap-1', style: { alignItems: 'center' } },
                h('span', { className: `badge ${m.role === 'owner' ? 'badge-warning' : 'badge-primary'}` }, m.role),
                canManage && m.role !== 'owner' && h('button', {
                  className: 'btn btn-icon btn-sm',
                  onClick: () => removeMember(m.id),
                  style: { color: 'var(--danger)' }
                }, Icons.trash)))))));
}

// Create Profile
function CreateProfile({ onCreated, onCancel }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const profile = await api.post('/api/profiles', { name, description });
      onCreated(profile);
    } finally {
      setLoading(false);
    }
  };
  
  return h('div', { className: 'card' },
    h('div', { className: 'card-header' },
      h('h3', null, 'Nowy profil'),
      h('button', { className: 'btn btn-sm btn-outline', onClick: onCancel }, 'Anuluj')),
    h('div', { className: 'card-body' },
      h('form', { onSubmit: handleSubmit },
        h('div', { className: 'form-group' },
          h('label', { className: 'form-label' }, 'Nazwa profilu'),
          h('input', { 
            className: 'form-input', 
            value: name, 
            onChange: e => setName(e.target.value),
            placeholder: 'np. Zakupy domowe',
            required: true
          })),
        h('div', { className: 'form-group' },
          h('label', { className: 'form-label' }, 'Opis (opcjonalnie)'),
          h('input', { 
            className: 'form-input', 
            value: description, 
            onChange: e => setDescription(e.target.value),
            placeholder: 'Krótki opis...'
          })),
        h('button', { className: 'btn btn-primary btn-block', disabled: loading },
          loading ? 'Tworzenie...' : 'Utwórz profil'))));
}

// Shopping Lists
function ShoppingLists({ profile, onSelectList, onBack }) {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [tab, setTab] = useState('active');
  
  const getDefaultListName = useCallback(() => {
    const today = new Date().toLocaleDateString('pl-PL');
    const todayLists = lists.filter(l => l.name.startsWith(today));
    if (todayLists.length === 0) return today;
    return `${today} (${todayLists.length + 1})`;
  }, [lists]);
  
  const loadLists = useCallback(() => {
    api.get(`/api/profiles/${profile.id}/lists?status=${tab}`)
      .then(setLists)
      .finally(() => setLoading(false));
  }, [profile.id, tab]);
  
  useEffect(() => { loadLists(); }, [loadLists]);
  
  const openCreateForm = () => {
    setNewListName(getDefaultListName());
    setShowCreate(true);
  };
  
  const createList = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    try {
      await api.post(`/api/profiles/${profile.id}/lists`, { name: newListName });
      setNewListName('');
      setShowCreate(false);
      loadLists();
    } catch (err) {
      console.error(err);
    }
  };
  
  return h('div', null,
    h('div', { className: 'flex-between mb-2' },
      h('div', { className: 'flex gap-1', style: { alignItems: 'center' } },
        h('button', { className: 'btn btn-icon btn-outline', onClick: onBack }, Icons.back),
        h('h2', null, profile.name)),
      h('button', { className: 'btn btn-primary btn-sm', onClick: openCreateForm }, Icons.plus, ' Lista')),
    
    showCreate && h('form', { className: 'add-item-form', onSubmit: createList },
      h('input', {
        className: 'form-input',
        placeholder: 'Nazwa listy...',
        value: newListName,
        onChange: e => setNewListName(e.target.value),
        autoFocus: true
      }),
      h('button', { className: 'btn btn-primary' }, 'Utwórz'),
      h('button', { 
        className: 'btn btn-outline', 
        type: 'button',
        onClick: () => setShowCreate(false) 
      }, 'Anuluj')),
    
    h('div', { className: 'tabs' },
      h('button', { className: `tab ${tab === 'active' ? 'active' : ''}`, onClick: () => setTab('active') }, 'Aktywne'),
      h('button', { className: `tab ${tab === 'completed' ? 'active' : ''}`, onClick: () => setTab('completed') }, 'Ukończone')),
    
    loading 
      ? h('div', { className: 'loading' }, h('div', { className: 'spinner' }))
      : lists.length === 0
        ? h('div', { className: 'empty-state' },
            Icons.list,
            h('p', null, tab === 'active' ? 'Brak aktywnych list' : 'Brak ukończonych list'))
        : lists.map(list => h('div', { 
            key: list.id, 
            className: 'card mb-1',
            onClick: () => onSelectList(list),
            style: { cursor: 'pointer' }
          },
            h('div', { className: 'card-body' },
              h('div', { className: 'flex-between' },
                h('strong', null, list.name),
                h('span', { className: 'text-sm text-muted' },
                  `${list.checked_items || 0}/${list.total_items || 0}`)),
              list.total_items > 0 && h('div', { className: 'progress mt-1' },
                h('div', { 
                  className: 'progress-bar',
                  style: { width: `${(list.checked_items / list.total_items) * 100}%` }
                }))))));
}

// Shopping List Detail
function ShoppingListDetail({ list: initialList, profileId, onBack }) {
  const [list, setList] = useState(initialList);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newUnit, setNewUnit] = useState('szt');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showToast, ToastComponent] = useToast();
  const inputRef = useRef(null);
  
  const loadList = useCallback(async () => {
    try {
      const data = await api.get(`/api/lists/${list.id}`);
      setList(data);
      setItems(data.items || []);
    } catch (err) {
      console.error('Error loading list:', err);
    } finally {
      setLoading(false);
    }
  }, [list.id]);
  
  useEffect(() => { loadList(); }, [loadList]);
  
  const fetchSuggestions = async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const [products, profileItems] = await Promise.all([
        api.get(`/api/suggestions/products?q=${encodeURIComponent(query)}&limit=5`),
        api.get(`/api/suggestions/profile/${profileId}/items?q=${encodeURIComponent(query)}&limit=5`)
      ]);
      
      const combined = [];
      profileItems.forEach(p => combined.push({ ...p, source: 'history' }));
      products.forEach(p => {
        if (!combined.find(c => c.name.toLowerCase() === p.name.toLowerCase())) {
          combined.push({ ...p, source: 'catalog' });
        }
      });
      setSuggestions(combined.slice(0, 8));
    } catch (err) {
      console.error('Suggestions error:', err);
    }
  };
  
  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewItem(value);
    fetchSuggestions(value);
    setShowSuggestions(true);
  };
  
  const selectSuggestion = async (suggestion) => {
    setNewItem(suggestion.name);
    setShowSuggestions(false);
    
    if (suggestion.suggestedQuantity) {
      setNewQty(suggestion.suggestedQuantity.toString());
    }
    if (suggestion.suggestedUnit || suggestion.defaultUnit) {
      setNewUnit(suggestion.suggestedUnit || suggestion.defaultUnit);
    }
    
    try {
      const qty = await api.get(`/api/suggestions/profile/${profileId}/quantity/${encodeURIComponent(suggestion.name)}`);
      if (qty.basedOnHistory) {
        setNewQty(qty.suggestedQuantity.toString());
        setNewUnit(qty.unit || 'szt');
      }
    } catch (err) {}
    
    inputRef.current?.focus();
  };
  
  const addItem = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    
    try {
      await api.post(`/api/lists/${list.id}/items`, {
        name: newItem,
        quantity: parseFloat(newQty) || 1,
        unit: newUnit
      });
      
      setNewItem('');
      setNewQty('1');
      setSuggestions([]);
      await loadList();
      showToast('Dodano do listy');
    } catch (err) {
      showToast('Błąd: ' + err.message);
    }
  };
  
  const toggleItem = async (item) => {
    try {
      await api.put(`/api/items/${item.id}`, { isChecked: !item.is_checked });
      await loadList();
    } catch (err) {
      showToast('Błąd: ' + err.message);
    }
  };
  
  const deleteItem = async (item) => {
    try {
      await api.delete(`/api/items/${item.id}`);
      await loadList();
      showToast('Usunięto');
    } catch (err) {
      showToast('Błąd: ' + err.message);
    }
  };
  
  const completeList = async () => {
    if (!confirm('Czy zakończyć tę listę zakupów?')) return;
    try {
      await api.put(`/api/lists/${list.id}`, { status: 'completed' });
      showToast('Lista zakończona');
      onBack();
    } catch (err) {
      showToast('Błąd: ' + err.message);
    }
  };
  
  if (loading) return h('div', { className: 'loading' }, h('div', { className: 'spinner' }));
  
  const unchecked = items.filter(i => !i.is_checked);
  const checked = items.filter(i => i.is_checked);
  
  return h('div', null,
    h('div', { className: 'flex-between mb-2' },
      h('div', { className: 'flex gap-1', style: { alignItems: 'center' } },
        h('button', { className: 'btn btn-icon btn-outline', onClick: onBack }, Icons.back),
        h('h2', null, list.name)),
      list.status === 'active' && h('button', { 
        className: 'btn btn-success btn-sm', 
        onClick: completeList 
      }, 'Zakończ')),
    
    items.length > 0 && h('div', { className: 'card mb-2' },
      h('div', { className: 'card-body' },
        h('div', { className: 'flex-between mb-1' },
          h('span', null, `${checked.length} z ${items.length} kupionych`),
          h('span', null, `${Math.round((checked.length / items.length) * 100)}%`)),
        h('div', { className: 'progress' },
          h('div', { className: 'progress-bar', style: { width: `${(checked.length / items.length) * 100}%` } })))),
    
    list.status === 'active' && h('form', { className: 'add-item-form', onSubmit: addItem },
      h('div', { className: 'input-wrapper', style: { flex: 1 } },
        h('input', {
          ref: inputRef,
          className: 'form-input',
          placeholder: 'Dodaj produkt...',
          value: newItem,
          onChange: handleInputChange,
          onFocus: () => setShowSuggestions(true),
          onBlur: () => setTimeout(() => setShowSuggestions(false), 200)
        }),
        showSuggestions && suggestions.length > 0 && h('div', { className: 'suggestions' },
          suggestions.map((s, i) => h('div', {
            key: i,
            className: 'suggestion-item',
            onMouseDown: () => selectSuggestion(s)
          },
            h('div', null, 
              h('strong', null, s.name),
              s.source === 'history' && h('span', { className: 'text-sm text-muted' }, 
                ` (kupiono ${s.timesBought}x)`)),
            s.suggestedQuantity && h('div', { className: 'text-sm text-muted' },
              `Sugerowane: ${s.suggestedQuantity} ${s.suggestedUnit || ''}`))))),
      h('input', {
        className: 'form-input',
        type: 'number',
        step: '0.1',
        min: '0.1',
        style: { width: '60px' },
        value: newQty,
        onChange: e => setNewQty(e.target.value)
      }),
      h('select', {
        className: 'form-input',
        style: { width: '70px' },
        value: newUnit,
        onChange: e => setNewUnit(e.target.value)
      },
        h('option', { value: 'szt' }, 'szt'),
        h('option', { value: 'kg' }, 'kg'),
        h('option', { value: 'g' }, 'g'),
        h('option', { value: 'l' }, 'l'),
        h('option', { value: 'ml' }, 'ml')),
      h('button', { className: 'btn btn-primary' }, Icons.plus)),
    
    h('div', { className: 'card' },
      unchecked.length === 0 && checked.length === 0
        ? h('div', { className: 'empty-state' },
            Icons.list,
            h('p', null, 'Lista jest pusta'))
        : h('ul', { className: 'checklist' },
            unchecked.map(item => h('li', { key: item.id, className: 'checklist-item' },
              h('div', { className: 'checkbox', onClick: () => toggleItem(item) }),
              h('div', { className: 'item-content' },
                h('div', { className: 'item-name' }, item.name),
                h('div', { className: 'item-meta' }, `${item.quantity} ${item.unit || 'szt'}`)),
              h('div', { className: 'item-actions' },
                h('button', { 
                  className: 'btn btn-icon btn-sm', 
                  onClick: () => deleteItem(item),
                  style: { color: 'var(--danger)' }
                }, Icons.trash)))),
            checked.length > 0 && h('li', { 
              style: { padding: '0.5rem 1rem', background: 'var(--bg)', fontWeight: 500, fontSize: '0.875rem' } 
            }, `Kupione (${checked.length})`),
            checked.map(item => h('li', { key: item.id, className: 'checklist-item checked' },
              h('div', { className: 'checkbox checked', onClick: () => toggleItem(item) }, Icons.check),
              h('div', { className: 'item-content' },
                h('div', { className: 'item-name' }, item.name),
                h('div', { className: 'item-meta' }, `${item.quantity} ${item.unit || 'szt'}`)),
              h('div', { className: 'item-actions' },
                h('button', { 
                  className: 'btn btn-icon btn-sm', 
                  onClick: () => deleteItem(item),
                  style: { color: 'var(--danger)' }
                }, Icons.trash)))))),
    
    ToastComponent);
}

// Analytics View
function Analytics({ profile }) {
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);
  
  useEffect(() => {
    Promise.all([
      api.get(`/api/analytics/profile/${profile.id}/stats`),
      api.get(`/api/analytics/profile/${profile.id}/patterns`)
    ]).then(([s, p]) => {
      setStats(s);
      setPatterns(p);
    }).finally(() => setLoading(false));
  }, [profile.id]);
  
  const loadAIInsights = async () => {
    setLoadingAI(true);
    try {
      const data = await api.get(`/api/analytics/profile/${profile.id}/ai-insights`);
      setInsights(data.insights);
    } finally {
      setLoadingAI(false);
    }
  };
  
  if (loading) return h('div', { className: 'loading' }, h('div', { className: 'spinner' }));
  
  return h('div', null,
    h('h2', { className: 'mb-2' }, 'Statystyki'),
    
    h('div', { className: 'stats-grid' },
      h('div', { className: 'stat-card' },
        h('div', { className: 'stat-value' }, stats?.total_lists || 0),
        h('div', { className: 'stat-label' }, 'Wszystkich list')),
      h('div', { className: 'stat-card' },
        h('div', { className: 'stat-value' }, stats?.completed_lists || 0),
        h('div', { className: 'stat-label' }, 'Ukończonych')),
      h('div', { className: 'stat-card' },
        h('div', { className: 'stat-value' }, stats?.total_items_purchased || 0),
        h('div', { className: 'stat-label' }, 'Kupionych produktów')),
      h('div', { className: 'stat-card' },
        h('div', { className: 'stat-value' }, stats?.topProducts?.length || 0),
        h('div', { className: 'stat-label' }, 'Unikalnych produktów'))),
    
    h('div', { className: 'card mb-2' },
      h('div', { className: 'card-header' },
        h('strong', null, 'Najczęściej kupowane')),
      h('div', { className: 'card-body' },
        stats?.topProducts?.slice(0, 10).map((p, i) => h('div', { 
          key: i, 
          className: 'flex-between',
          style: { padding: '0.5rem 0', borderBottom: i < 9 ? '1px solid var(--border)' : 'none' }
        },
          h('span', null, p.product_name),
          h('span', { className: 'text-muted' }, `${p.count}x (śr. ${p.avg_quantity} ${p.common_unit || 'szt'})`))))),
    
    patterns?.frequentlyBoughtTogether?.length > 0 && h('div', { className: 'card mb-2' },
      h('div', { className: 'card-header' },
        h('strong', null, 'Często kupowane razem')),
      h('div', { className: 'card-body' },
        patterns.frequentlyBoughtTogether.slice(0, 5).map((p, i) => h('div', { 
          key: i,
          style: { padding: '0.5rem 0' }
        }, `${p.product1} + ${p.product2} (${p.times_together}x)`)))),
    
    h('div', { className: 'card' },
      h('div', { className: 'card-header' },
        h('strong', null, 'Analiza AI'),
        !insights && h('button', { 
          className: 'btn btn-primary btn-sm', 
          onClick: loadAIInsights,
          disabled: loadingAI
        }, loadingAI ? 'Analizowanie...' : 'Generuj analizę')),
      h('div', { className: 'card-body' },
        insights 
          ? h('p', { style: { whiteSpace: 'pre-wrap' } }, insights)
          : h('p', { className: 'text-muted' }, 'Kliknij przycisk aby wygenerować analizę AI twoich zakupów'))));
}

// Admin Panel
function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showToast, ToastComponent] = useToast();
  
  const loadData = async () => {
    try {
      const [u, p] = await Promise.all([
        api.get('/api/auth/users'),
        api.get('/api/auth/users/pending')
      ]);
      setUsers(u);
      setPending(p);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { loadData(); }, []);
  
  const approveUser = async (id) => {
    await api.put(`/api/auth/users/${id}/approve`);
    showToast('Użytkownik zatwierdzony');
    loadData();
  };
  
  const changeRole = async (id, role) => {
    await api.put(`/api/auth/users/${id}/role`, { role });
    showToast('Rola zmieniona');
    loadData();
  };
  
  if (loading) return h('div', { className: 'loading' }, h('div', { className: 'spinner' }));
  
  return h('div', null,
    h('h2', { className: 'mb-2' }, 'Panel administratora'),
    
    pending.length > 0 && h('div', { className: 'card mb-2' },
      h('div', { className: 'card-header' },
        h('strong', null, 'Oczekujący na zatwierdzenie'),
        h('span', { className: 'badge badge-warning' }, pending.length)),
      h('div', { className: 'card-body' },
        pending.map(u => h('div', { 
          key: u.id, 
          className: 'flex-between',
          style: { padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }
        },
          h('div', null,
            h('strong', null, u.name),
            h('div', { className: 'text-sm text-muted' }, u.email)),
          h('button', { 
            className: 'btn btn-success btn-sm',
            onClick: () => approveUser(u.id)
          }, 'Zatwierdź'))))),
    
    h('div', { className: 'card' },
      h('div', { className: 'card-header' },
        h('strong', null, 'Użytkownicy')),
      h('div', { className: 'card-body' },
        users.map(u => h('div', { 
          key: u.id,
          className: 'flex-between',
          style: { padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }
        },
          h('div', null,
            h('strong', null, u.name),
            h('div', { className: 'text-sm text-muted' }, u.email)),
          h('div', { className: 'flex gap-1' },
            h('select', {
              className: 'form-input',
              style: { width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.875rem' },
              value: u.role,
              onChange: e => changeRole(u.id, e.target.value)
            },
              h('option', { value: 'user' }, 'User'),
              h('option', { value: 'manager' }, 'Manager'),
              h('option', { value: 'admin' }, 'Admin')),
            h('span', { className: `badge ${u.is_approved ? 'badge-success' : 'badge-warning'}` },
              u.is_approved ? 'Aktywny' : 'Oczekuje')))))),
    
    ToastComponent);
}

// Main App
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('profiles');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedList, setSelectedList] = useState(null);
  
  useEffect(() => {
    if (api.token) {
      api.get('/api/auth/verify')
        .then(data => setUser(data.user))
        .catch(() => api.setToken(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);
  
  const handleLogout = () => {
    api.setToken(null);
    setUser(null);
    setView('profiles');
    setSelectedProfile(null);
    setSelectedList(null);
  };
  
  if (loading) return h('div', { className: 'app' },
    h('div', { className: 'main', style: { display: 'flex', alignItems: 'center', justifyContent: 'center' } },
      h('div', { className: 'loading' }, h('div', { className: 'spinner' }), 'Ładowanie...')));
  
  if (!user) return h(Login, { onLogin: setUser });
  
  const renderContent = () => {
    if (selectedList && selectedProfile) {
      return h(ShoppingListDetail, { 
        list: selectedList, 
        profileId: selectedProfile.id,
        onBack: () => setSelectedList(null) 
      });
    }
    
    if (selectedProfile && view === 'profiles') {
      return h(ShoppingLists, {
        profile: selectedProfile,
        onSelectList: setSelectedList,
        onBack: () => setSelectedProfile(null)
      });
    }
    
    switch (view) {
      case 'profiles':
        return h(ProfilesList, {
          user,
          onSelect: setSelectedProfile,
          onCreateNew: () => setView('create-profile'),
          onManageGroups: () => setView('groups')
        });
      case 'create-profile':
        return h(CreateProfile, {
          onCreated: (profile) => { setSelectedProfile(profile); setView('profiles'); },
          onCancel: () => setView('profiles')
        });
      case 'groups':
        return h(GroupsManagement, {
          onBack: () => setView('profiles')
        });
      case 'analytics':
        return selectedProfile 
          ? h(Analytics, { profile: selectedProfile })
          : h('div', { className: 'empty-state' },
              Icons.chart,
              h('p', null, 'Wybierz profil aby zobaczyć statystyki'));
      case 'admin':
        return h(AdminPanel);
      default:
        return null;
    }
  };
  
  return h('div', { className: 'app' },
    h('header', { className: 'header' },
      h('div', { className: 'flex-between' },
        h('h1', null, '🛒 Smart Lista'),
        h('div', { className: 'flex gap-1' },
          h('span', { className: 'badge badge-primary' }, user.role),
          h('button', { 
            className: 'btn btn-icon btn-sm', 
            onClick: handleLogout,
            style: { color: 'white' }
          }, Icons.logout)))),
    
    h('main', { className: 'main' }, renderContent()),
    
    h('nav', { className: 'nav-bottom' },
      h('button', { 
        className: `nav-item ${view === 'profiles' && !selectedProfile ? 'active' : ''}`,
        onClick: () => { setView('profiles'); setSelectedProfile(null); setSelectedList(null); }
      }, Icons.folder, 'Profile'),
      selectedProfile && h('button', { 
        className: `nav-item ${view === 'analytics' ? 'active' : ''}`,
        onClick: () => setView('analytics')
      }, Icons.chart, 'Statystyki'),
      (user.role === 'admin' || user.role === 'manager') && h('button', { 
        className: `nav-item ${view === 'admin' ? 'active' : ''}`,
        onClick: () => setView('admin')
      }, Icons.settings, 'Admin')));
}

// Render
ReactDOM.createRoot(document.getElementById('root')).render(h(App));