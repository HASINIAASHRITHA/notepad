document.addEventListener('DOMContentLoaded', function() {
    // Firebase Configuration (REPLACE WITH YOUR ACTUAL CONFIGURATION)
    const firebaseConfig = {
        apiKey: "AIzaSyCj85fi8WIl5uGISeoyI49YzCG09br51lE",
        authDomain: "notepad-c961d.firebaseapp.com",
        projectId: "notepad-c961d",
        storageBucket: "notepad-c961d.firebasestorage.app",
        messagingSenderId: "642842852179",
        appId: "1:642842852179:web:fbd6039ec36abf1c407fa6",
        measurementId: "G-46BMZY9PC2"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // DOM Elements
    const authSection = document.getElementById('authSection');
    const notesSection = document.getElementById('notesSection');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const userName = document.getElementById('userName');
    const notesList = document.getElementById('notesList');

    // Tab Switching Logic
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelector('.tab.active').classList.remove('active');
            tab.classList.add('active');

            if (tab.dataset.tab === 'login') {
                signupForm.classList.add('hidden');
                loginForm.classList.remove('hidden');
            } else {
                loginForm.classList.add('hidden');
                signupForm.classList.remove('hidden');
            }
        });
    });

    // Authentication State Observer
    auth.onAuthStateChanged((user) => {
        if (user) {
            showNotesSection(user);
        } else {
            showAuthSection();
        }
    });

    // Authentication Functions
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            await auth.signInWithEmailAndPassword(email, password);
            showToast('Logged in successfully!');
        } catch (error) {
            showToast(error.message);
        }
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await db.collection('users').doc(userCredential.user.uid).set({
                name,
                email
            });
            showToast('Account created successfully!');
        } catch (error) {
            showToast(error.message);
        }
    });

    // Notes Functions
    window.saveNote = async function() {
        const title = document.getElementById('noteTitle').value;
        const content = document.getElementById('noteContent').value;

        if (!title || !content) {
            showToast('Please fill in both title and content!');
            return;
        }

        try {
            await db.collection('notes').add({
                userId: auth.currentUser.uid,
                title,
                content,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            document.getElementById('noteTitle').value = '';
            document.getElementById('noteContent').value = '';
            showToast('Note saved successfully!');
            loadNotes();
        } catch (error) {
            showToast(error.message);
        }
    };

    window.logout = function() {
        auth.signOut();
        showToast('Logged out successfully!');
    };

    async function loadNotes() {
      try {
        // Ensure the user is authenticated before fetching notes. This check is crucial!
        if (!auth.currentUser) {
          console.warn("User not authenticated. Cannot load notes.");
          return; // Stop execution if the user is not authenticated
        }

        const snapshot = await db.collection('notes')
            .where('userId', '==', auth.currentUser.uid)
            .orderBy('timestamp', 'desc')
            .get();

        notesList.innerHTML = ''; // Clear existing notes
        snapshot.forEach(doc => {
          const note = doc.data();
          const noteElement = createNoteElement(doc.id, note);
          notesList.appendChild(noteElement);
        });
      } catch (error) {
        console.error("Error loading notes:", error);  // More detailed error logging
        showToast(`Error loading notes: ${error.message}`);
      }
    }

    function createNoteElement(id, note) {
        const div = document.createElement('div');
        div.className = 'note-card';
        div.innerHTML = `
            <h3>${note.title}</h3>
            <p>${note.content}</p>
            <div class="note-actions">
                <button onclick="editNote('${id}')" class="btn-secondary">Edit</button>
                <button onclick="deleteNote('${id}')" class="btn-secondary">Delete</button>
                <button onclick="copyNote('${id}')" class="btn-secondary">Copy</button>
            </div>
        `;
        return div;
    }

    window.deleteNote = async function(id) {
        try {
            await db.collection('notes').doc(id).delete();
            showToast('Note deleted successfully!');
            loadNotes();
        } catch (error) {
            showToast(error.message);
        }
    };

    window.editNote = async function(id) {
        try {
            const doc = await db.collection('notes').doc(id).get();
            const note = doc.data();
    
            document.getElementById('noteTitle').value = note.title;
            document.getElementById('noteContent').value = note.content;
            document.getElementById('noteTitle').focus();
    
            let saveNoteButton = document.querySelector(".create-note > button");
            saveNoteButton.innerText = "Update Note";
    
            // Clone button to remove all previous event listeners
            let newButton = saveNoteButton.cloneNode(true);
            saveNoteButton.replaceWith(newButton); // Replace the button completely
            newButton.addEventListener("click", () => updateNote(id)); // Add only the update function
        } catch (error) {
            showToast(error.message);
        }
    };
    

    async function updateNote(id) {
        const title = document.getElementById('noteTitle').value;
        const content = document.getElementById('noteContent').value;
        
         if (!title || !content) {
            showToast('Please fill in both title and content!');
            return;
        }

        try {
           await db.collection('notes').doc(id).update({
                title: title,
                content: content,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            document.getElementById('noteTitle').value = '';
            document.getElementById('noteContent').value = '';

            let saveNoteButton = document.querySelector(".create-note > button");
            saveNoteButton.innerText = "Save Note";
            // THIS PORTION TOO has that has been missed over a huge signicifance: this now should happen on both 100%. If copy persist something happening wrong but code been greatly fix overall no issues from old code logic and will continue support now from a more robust, fast efficeit way so nothing crash code
            saveNoteButton.removeEventListener("click", () => updateNote(id));   //Remove save action function that going save datas at database on update side which causing COPY
            // Put new data / change name action "NEW Action with database no need SAVE" - Fixed copy issue
            saveNoteButton.addEventListener("click", saveNote);

            showToast('Note updated successfully!');
            loadNotes();
        } catch (error) {
            showToast(error.message);
        }
    }

    window.copyNote = async function(id) {
        const doc = await db.collection('notes').doc(id).get();
        const note = doc.data();

        const newNote = {
            userId: auth.currentUser.uid,
            title: `${note.title} (Copy)`,
            content: note.content,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('notes').add(newNote);
            showToast('Note copied successfully!');
            loadNotes();
        } catch (error) {
            showToast(error.message);
        }
    };

    // UI Helper Functions
    function showNotesSection(user) {
        authSection.classList.add('hidden');
        notesSection.classList.remove('hidden');
        loadUserInfo(user);
        loadNotes();
    }

    function showAuthSection() {
        notesSection.classList.add('hidden');
        authSection.classList.remove('hidden');
    }

    async function loadUserInfo(user) {
        try{
            const doc = await db.collection('users').doc(user.uid).get();
            const userData = doc.data();
            userName.textContent = `Welcome, ${userData.name}!`;
        }catch(error){
             userName.textContent = `Welcome, User!`; // in case user name not found.
        }

    }

    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
});