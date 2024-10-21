// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, setDoc, addDoc, doc, serverTimestamp, 
    query, orderBy, where, getDoc, getDocs, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"
import {
    getAuth, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail,
    signInWithEmailAndPassword, onAuthStateChanged, signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js"

import firebaseConfig from "./config.js";
import moment from 'https://cdn.jsdelivr.net/npm/moment@2.30.1/+esm';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// init services
const db = getFirestore(app);
const auth = getAuth();

{
    // Signing users up
    const signupForm = document.querySelector('.signup');
    const signUpBtn = document.querySelector('#signUpBtn');

    if (signupForm) {
        signUpBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const matricNo = document.querySelector('#matricNo').value;
            const password = document.querySelector('#password').value;
            const email = document.querySelector('#email').value;
            const fullName = signupForm.name.value; // Get the full name from the input

            // Show the spinner before the sign-up process starts
            signUpBtn.classList.add('loading');  // Add the loading class to show spinner

            var docRef2 = doc(db, "users", matricNo);

            createUserWithEmailAndPassword(auth, email, password)
                .then(async (userCredential) => {
                    const user = userCredential.user; // Get the newly created user

                    // Extract the first name from the full name
                    const firstName = fullName.split(" ")[1]; // Get the Second element from the name

                    // Update the user's profile with the first name
                    await updateProfile(user, {
                        displayName: firstName // Set display name to the first name
                    });

                    // Set user data in Firestore
                    await setDoc(docRef2, {
                        Name: fullName.toUpperCase(),
                        Gender: signupForm.gender.value,
                        MatricNo: matricNo,
                        Institution: signupForm.school.value,
                        Course: signupForm.course.value,
                        Level: signupForm.level.value,
                        Email: email,
                        Role: "STUDENT",
                        isActive: "true",
                        isApproved: "false"
                    });

                    // Send email verification
                    await sendEmailVerification(user);
                    // Email verification sent!
                    alert('Registration successful; A verification link has been sent to your mail.');
                    window.location.href = '/';
                })
                .catch((err) => {
                    console.log(err.message);
                    alert('Error during registration: ' + err.message);
                })
                .finally(() => {
                    // Always remove the loading state, even in case of an error
                    signUpBtn.classList.remove('loading');  // Hide the spinner
                });
        });
    }

}

{
    // Users log in page
    const loginForm = document.querySelector('.login');
    const signInBtn = document.querySelector('#signInBtn');

    if (loginForm) {
        signInBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const matricNo = document.querySelector('#matricNo').value;
            const password = document.querySelector('#password').value;

            // Show the spinner before the sign-in process starts
            signInBtn.classList.add('loading');  // Add the loading class to show spinner

            try {
                // Create a reference to the document with the provided ID in the "user" collection
                const userDocRef = doc(db, "users", matricNo);

                // Retrieve the document data
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    // Extract and return the user data
                    const userData = userDocSnap.data();
                    if (userData.isActive === "true") {
                        await signInWithEmailAndPassword(auth, userData.Email, password);
                        window.location.href = './task-page.html';
                    } else {
                        // if the user is not active
                        alert("User has been disabled!!");
                        loginForm.reset();
                    }
                } else {
                    alert("User not found!");
                }
            } catch (error) {
                console.error("Error retrieving user:", error);
                alert('Login failed. Please check your credentials and try again.');
            } finally {
                // Always remove the loading state, even in case of an error
                signInBtn.classList.remove('loading');  // Hide the spinner
            }
        });
    };
}

{
    // Admin login page
    const adminLoginForm = document.querySelector('.admin-login');
    const signInBtn = document.querySelector('#signInBtn');

    if (adminLoginForm) {
        signInBtn.addEventListener('click', async (e) => {
            e.preventDefault(); // Prevent the form from submitting the default way
            const email = adminLoginForm.email.value;
            const password = adminLoginForm.password.value;

            // Show the spinner before the sign-in process starts
            signInBtn.classList.add('loading');  // Add the loading class to show spinner

            try {
                // Create a reference to the "users" collection and query by email
                const adminCollectionRef = collection(db, "admin");
                const q = query(adminCollectionRef, where("Email", "==", email));
                const querySnapshot = await getDocs(q);

                // Check if a user with the provided email exists
                if (!querySnapshot.empty) {
                    const userDocSnap = querySnapshot.docs[0];
                    const userData = userDocSnap.data();

                    // Check the role of the user
                    if (userData.isActive === "true") {
                        // Log in the admin
                        await signInWithEmailAndPassword(auth, email, password);
                        window.location.href = '/admin-student-list.html';
                    } else {
                        alert('User has been disabled!!!');
                        adminLoginForm.reset();
                    }
                } else {
                    alert("Error retrieving user:", error);
                    adminLoginForm.reset();
                }
            } catch (error) {
                // Handle any errors
                console.error("Error retrieving user:", error);
                alert('Login failed. Please check your credentials and try again.');
                adminLoginForm.reset();
            } finally {
                // Always remove the loading state, even in case of an error
                signInBtn.classList.remove('loading');  // Hide the spinner
            };
        });
    }
}

{
    // log users out
    const logoutButton = document.querySelector('.logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', async (e) => {
            try {
                // Get the current user's email
                const user = auth.currentUser;
                if (!user) {
                    console.error("No user is currently logged in.");
                    return;
                }

                const userEmail = user.email;
                // Check the "admins" collection first
                const adminQuerySnapshot = await getDocs(query(collection(db, "admin"), where("Email", "==", userEmail)));
                if (!adminQuerySnapshot.empty) {
                    const adminDoc = adminQuerySnapshot.docs[0];
                    const adminData = adminDoc.data();                    // Check if the role is ADMIN
                    if (adminData.role === "ADMIN" || adminData.role === "MODERATOR" || adminData.role === "SUPER ADMIN") {
                        await signOut(auth);
                        window.location.href = '/admin-login.html';
                    } else {
                        console.error("User is not an admin.");
                    }
                } else {
                    // If not found in "admins", check the "users" collection
                    const userQuerySnapshot = await getDocs(query(collection(db, "users"), where("Email", "==", userEmail)));
                    if (!userQuerySnapshot.empty) {
                        const userDoc = userQuerySnapshot.docs[0];
                        const userData = userDoc.data();
                        // Check if the role is USER                     
                        if (userData.Role === "STUDENT") {
                            await signOut(auth);
                            window.location.href = '/login.html';
                        } else {
                            console.error("User does not have a USER role.");
                        }
                    } else {
                        console.error("User not found in either 'admins' or 'users' collections.");
                    }
                }
            } catch (error) {
                // Handle any errors
                console.error("Error retrieving user:", error);
            }
        });
    }
}

{
    // log users out on smaller devices
    const logoutBtn = document.querySelector('.sec-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            try {
                // Get the current user's email
                const user = auth.currentUser;
                if (!user) {
                    console.error("No user is currently logged in.");
                    return;
                }

                const userEmail = user.email;
                // Check the "admins" collection first
                const adminQuerySnapshot = await getDocs(query(collection(db, "admin"), where("Email", "==", userEmail)));
                if (!adminQuerySnapshot.empty) {
                    const adminDoc = adminQuerySnapshot.docs[0];
                    const adminData = adminDoc.data();                    // Check if the role is ADMIN
                    if (adminData.role === "SUPER ADMIN" || adminData.role === "ADMIN" || adminData.role === "MODERATOR") {
                        await signOut(auth);
                        window.location.href = '/admin-login.html';
                    } else {
                        console.error("User is not an admin.");
                    }
                } else {
                    // If not found in "admins", check the "users" collection
                    const userQuerySnapshot = await getDocs(query(collection(db, "users"), where("Email", "==", userEmail)));
                    if (!userQuerySnapshot.empty) {
                        const userDoc = userQuerySnapshot.docs[0];
                        const userData = userDoc.data();
                        // Check if the role is USER                     
                        if (userData.Role === "STUDENT") {
                            await signOut(auth);
                            window.location.href = '/login.html';
                        } else {
                            console.error("User does not have a USER role.");
                        }
                    } else {
                        console.error("User not found in either 'admins' or 'users' collections.");
                    }
                }
            } catch (error) {
                // Handle any errors
                console.error("Error retrieving user:", error);
            }
        });
    }
}

{
    // navbar drop down and avatar display
    const dropdown = document.querySelector('.dropdown');
    const dropdownContent = document.querySelector('.dropdown-content');
    if (dropdown) {
        let timeout;

        // Show dropdown when hovering over button or dropdown
        dropdown.addEventListener('mouseenter', () => {
            clearTimeout(timeout);
            dropdownContent.classList.add('show');
        });

        // Hide dropdown after a delay when mouse leaves the button or dropdown
        dropdown.addEventListener('mouseleave', () => {
            timeout = setTimeout(() => {
                dropdownContent.classList.remove('show');
            }, 1000); // 1 second delay before hiding
        });
    };
}

{
    //company info page
    const companyInfoForm = document.querySelector('.companyInfo');
    
    if (companyInfoForm) {
        checkStudentAuth();
        const splash = document.querySelector('.splash-screen');
        const duration = 3000;

        function removeSplash() {
            splash.classList.add('remove-splash');
        }

        setTimeout(() => {
            removeSplash();
        }, duration);

        // Listen for auth state changes to ensure a user is signed in
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userEmail = user.email;

                try {
                    // Retrieve the user ID based on the authenticated email
                    const userId = await getUserIdAsync(userEmail);

                    if (userId) {
                        const companyDocRef = doc(db, 'company', userId);
                        const docSnapshot = await getDoc(companyDocRef);

                        if (docSnapshot.exists()) {
                            // If the document exists, render the company info
                            renderCompanyInfo(userId);

                        } else {
                            // Handle form submission for creating a new document
                            companyInfoForm.addEventListener('submit', async (e) => {
                                e.preventDefault();

                                try {
                                    // Save the company info to Firestore
                                    await setDoc(companyDocRef, {
                                        companyName: companyInfoForm.name.value,
                                        Address: companyInfoForm.address.value,
                                        Supervisor: companyInfoForm.supervisor.value
                                    });

                                    // Re-render the company info after the form submission
                                    alert('Company Info Saved');
                                    renderCompanyInfo(userId);

                                } catch (error) {
                                    console.error("Error saving company info: ", error);
                                    // Handle any errors during submission
                                }
                            });
                        }
                    } else {
                        console.error("No user ID found for this email.");
                    }
                } catch (error) {
                    console.error("Error retrieving user ID:", error);
                }
            } else {
                // If the user is not signed in, redirect to login page
                console.error("No user is signed in.");
                window.location.href = '/login.html';
            }
        });



        // Function to fetch and render company info
        async function renderCompanyInfo(userId) {
            try {
                const companyDocRef = doc(db, 'company', userId);
                const docSnapshot = await getDoc(companyDocRef);

                if (docSnapshot.exists()) {
                    const companyData = docSnapshot.data();

                    // Update input fields with the saved data and disable them
                    companyInfoForm.name.value = companyData.companyName || '';
                    companyInfoForm.address.value = companyData.Address || '';
                    companyInfoForm.supervisor.value = companyData.Supervisor || '';

                    // Disable input fields to prevent further edits
                    companyInfoForm.name.disabled = true;
                    companyInfoForm.address.disabled = true;
                    companyInfoForm.supervisor.disabled = true;

                    // Hide the save button
                    const saveButton = document.querySelector('.save-button');
                    saveButton.style.display = 'none';
                } else {
                    console.log("No company document found.");
                }
            } catch (error) {
                console.error('Error fetching company info: ', error);
            };
        };
    };
}

{
    // Tasks Page
    const taskForm = document.querySelector('.taskForm');
    if (taskForm) {
        checkStudentAuth();

        // Execute authentication first to ensure `user` is defined before using it
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // User is signed in, retrieve the user ID based on email
                const userEmail = user.email;
                const taskBtn = document.querySelector('.task-button');
                const approvalBtn = document.querySelector('.approve-icon');

                try {
                    const userId = await getUserIdAsync(userEmail);
                    if (userId) {
                        // Call function to render existing tasks on page load
                        renderTasksInOrder(userId);

                        const docSnapshot = await getDoc(doc(db, 'users', userId));
                        if (docSnapshot.exists()) {
                            const userData = docSnapshot.data();

                            // Check if the user is approved
                            if (userData.isApproved === "true") {
                                // Show approval button and hide task button
                                approvalBtn.style.display = 'block';
                                taskBtn.style.display = 'none';
                            } else {
                                // Show task button and hide approval button if not approved
                                taskBtn.style.display = 'block';
                                approvalBtn.style.display = 'none';
                            }
                        } else {
                            console.error("User data not found for this ID.");
                        }

                        // Setup form submission to add a new task
                        taskForm.addEventListener('submit', async (e) => {
                            e.preventDefault();

                            try {
                                const description = document.getElementById('description').value;  // Get the value from the textarea
                                const tasksCollectionRef = collection(db, 'Tasks', userId, "UserTasks");

                                // Add a new task document with auto-generated ID
                                await addDoc(tasksCollectionRef, {
                                    userId: userId,
                                    Description: description,
                                    createdAt: serverTimestamp()
                                });

                                // Append the new task to the list
                                renderTasksInOrder(userId);

                                // Alert message
                                alert('Task Saved Successfully');
                                const userModal = bootstrap.Modal.getInstance(document.getElementById('Task'));
                                userModal.hide();  // Close the modal after revoking
                                taskForm.reset();
                            } catch (error) {
                                console.error("Error saving task: ", error);
                            }
                        });
                    } else {
                        console.error("No user ID found for this email.");
                    }
                } catch (error) {
                    console.error("Error retrieving user ID:", error);
                }
            } else {
                // No user is signed in, redirect to login page
                console.error("No user is signed in.");
                window.location.href = '/login.html';
            }
        });



        // Function to fetch and render tasks in ascending order
        async function renderTasksInOrder(userId) {
            try {
                const taskWrapper = document.querySelector('.task-wrapper');
                taskWrapper.innerHTML = '';  // Clear existing tasks

                const tasksCollectionRef = collection(db, 'Tasks', userId, "UserTasks");
                const q = query(tasksCollectionRef, orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    const createdAt = moment.unix(data.createdAt.seconds);  // Get the task creation time

                    const now = moment();  // Get the current time
                    const hoursDiff = now.diff(createdAt, 'hours');  // Calculate the difference in hours

                    let displayTime;

                    // If the task is created within the last 24 hours, show relative time, otherwise show timestamp
                    if (hoursDiff < 24) {
                        displayTime = createdAt.fromNow();  // Show relative time
                    } else {
                        displayTime = createdAt.format('MMMM Do YYYY');  // Show exact timestamp
                    }

                    // Prepare HTML content to append
                    const cardHTML = `
                        <div class="card">
                            <div class="card-body">
                                <div class="card-date-time text-secondary">${displayTime}</div>
                                <div class="card-text">${data.Description}</div>
                            </div>
                        </div>
                    `;

                    // Append the card using insertAdjacentHTML
                    taskWrapper.insertAdjacentHTML('beforeend', cardHTML);
                });
            } catch (error) {
                console.error('Error fetching tasks: ', error);
            }
        }
    };
}

{
    // User Profile Page
    const userPage = document.querySelector('.users-info');
    if (userPage) {
        checkStudentAuth();
        // Show loading indicator while fetching data
        document.querySelector('.name').textContent = 'Loading...';
        document.querySelector('.matricNo').textContent = 'Loading...';
        document.querySelector('.email').textContent = 'Loading...';
        document.querySelector('.school').textContent = 'Loading...';
        document.querySelector('.level').textContent = 'Loading...';
        document.querySelector('.course').textContent = 'Loading...';
        async function renderUserProfile(userId) {
            try {
                // Reference to the user document in the Users collection
                const userDocRef = doc(db, 'users', userId);
                const docSnapshot = await getDoc(userDocRef);

                if (docSnapshot.exists()) {
                    const userData = docSnapshot.data();

                    // Display the user data on the profile page
                    document.querySelector('.name').textContent = userData.Name;
                    document.querySelector('.matricNo').textContent = userData.MatricNo;
                    document.querySelector('.email').textContent = userData.Email;
                    document.querySelector('.school').textContent = userData.Institution;
                    document.querySelector('.level').textContent = userData.Level;
                    document.querySelector('.course').textContent = userData.Course;
                    // Update more fields as needed
                } else {
                    console.log("No such document!");
                }
            } catch (error) {
                console.error('Error fetching user profile: ', error);
            }
        }

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // User is signed in, retrieve the user ID based on email
                const userEmail = user.email;

                try {
                    const userId = await getUserIdAsync(userEmail);
                    if (userId) {
                        // User ID found, proceed to render the user profile
                        renderUserProfile(userId);
                        console.log("User ID retrieved successfully:", userId);
                    } else {
                        console.error("No user ID found for this email.");
                        window.location.href = '/login.html'
                    }
                } catch (error) {
                    console.error("Error retrieving user ID:", error);
                }
            } else {
                // No user is signed in, redirect to login page
                console.error("No user is signed in.");
                window.location.href = '/login.html';
            }
        });
    };
}

{
    // Change Password Page
    const changePasswordForm = document.querySelector('.changepassword');
    const changePasswordBtn = document.querySelector('#changePasswordBtn');
    const currentPasswordInput = document.querySelector('.currentpassword');
    const newPasswordInput = document.querySelector('.newpassword');
    const confirmPasswordInput = document.querySelector('.confirmpassword');

    // Handle form submission
    if (changePasswordForm) {
        checkStudentAuth();
        changePasswordBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const currentPassword = currentPasswordInput.value;
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // Show the spinner before the sign-up process starts
            changePasswordBtn.classList.add('loading');  // Add the loading class to show spinner            

            // Check if new password and confirm password match
            if (newPassword !== confirmPassword) {
                alert('New password and confirmation do not match.');
                changePasswordForm.reset();
                return;
            }

            // Get the current user
            const user = auth.currentUser;

            if (user) {
                try {
                    // Reauthenticate the user with current password
                    const credential = EmailAuthProvider.credential(user.email, currentPassword);
                    await reauthenticateWithCredential(user, credential);

                    // Update password
                    await updatePassword(user, newPassword);
                    alert('Password changed successfully!');
                    window.location.href = '/login.html';
                } catch (error) {
                    console.error('Error changing password:', error);
                } finally {
                    // Always remove the loading state, even in case of an error
                    changePasswordBtn.classList.remove('loading');  // Hide the spinner
                }
            } else {
                alert('No user is currently signed in.');
            }
        });
    }
}

{
    // Admin Change Password Page
    const adminChangePasswordForm = document.querySelector('.admin-change-password');
    const adminChangePasswordBtn = document.querySelector('#changePasswordBtn');
    const currentPasswordInput = document.querySelector('.currentpassword');
    const newPasswordInput = document.querySelector('.newpassword');
    const confirmPasswordInput = document.querySelector('.confirmpassword');

    // Handle form submission
    if (adminChangePasswordForm) {
        checkAdminAuth();
        adminChangePasswordBtn.addEventListener('click', async (e) => {
            e.preventDefault();            

            const currentPassword = currentPasswordInput.value;
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // Show the spinner before the sign-up process starts
            adminChangePasswordBtn.classList.add('loading');  // Add the loading class to show spinner

            // Check if new password and confirm password match
            if (newPassword !== confirmPassword) {
                alert('New password and confirmation do not match.');
                adminChangePasswordForm.reset();
                return;
            }

            // Get the current user
            const user = auth.currentUser;

            if (user) {
                try {
                    // Reauthenticate the user with current password
                    const credential = EmailAuthProvider.credential(user.email, currentPassword);
                    await reauthenticateWithCredential(user, credential);

                    // Update password
                    await updatePassword(user, newPassword);
                    alert('Password changed successfully!');
                    window.location.href = '/admin-login.html';
                } catch (error) {
                    console.error('Error changing password:', error);
                } finally {
                    // Always remove the loading state, even in case of an error
                    adminChangePasswordBtn.classList.remove('loading');  // Hide the spinner
                };
            } else {
                alert('No user is currently signed in.');
            }
        });
    }
}

{
    // Admin Students list page
    const usersTableBody = document.querySelector('.users-table-body');
    const tableText = document.querySelector('.table-text');

    if (usersTableBody) {  // Ensure usersTableBody exists on the current page
        checkAdminAuth();

        // call active students data on page load
        fetchActiveStudents();

        // Fetch and display All Students
        async function fetchActiveStudents() {
            try {
                const querySnapshot = await getDocs(collection(db, 'users'));
                usersTableBody.innerHTML = ''; // Clear existing table rows
                let recordFound = false; // Flag to track if any record is found
                querySnapshot.forEach((doc) => {
                    const userData = doc.data();

                    if (userData.isActive === "true") {
                        recordFound = true; // Mark that at least one record is found
                        // Create a table row for each user
                        const row = `
                            <tr class="user-row" data-email="${userData.Email}">
                                <td><span class="styled-name">${userData.Name}</span></td>
                                <td>${userData.Institution}</td>
                                <td>${userData.Level}</td>
                                <td>
                                    <p class="text-success fw-semibold" style="display: inline;">Active</p>
                                    <img src="images/icons8-edit.svg" title="disable student" alt="disable icon" 
                                    class="disable-icon" data-id="${userData.MatricNo}" style="display: inline;">
                                </td>
                                <!-- Add more fields as necessary -->
                            </tr>`;

                        if (recordFound) {
                            tableText.style.display = 'none';
                        } else {
                            // Show the "No Record Found" message if no records found
                            tableText.style.display = 'block';
                        }

                        // Insert the row into the table body
                        usersTableBody.insertAdjacentHTML('beforeend', row);
                    }

                    // Add click event listeners to each row
                    document.querySelectorAll('.user-row').forEach(row => {
                        row.addEventListener('click', async (e) => {
                            // Get the email from the row's data attribute
                            const userEmail = row.getAttribute('data-email');

                            // Fetch the user ID using the email
                            const userId = await getUserIdAsync(userEmail);

                            if (userId) {
                                // Store the userId in sessionStorage or localStorage
                                sessionStorage.setItem('selectedUserId', userId);
                                // Redirect to the user details page
                                window.location.href = '/admin-user-details.html';
                            } else {
                                console.log("User not found.");
                            }
                        });
                    });

                    // Now that all rows have been inserted, attach click event listeners to all disable icons
                    const disableIcons = document.querySelectorAll('.disable-icon');

                    disableIcons.forEach((icon) => {
                        icon.addEventListener('click', (e) => {
                            e.stopPropagation();
                            // Get the email from the clicked image's data attribute
                            const targetId = icon.getAttribute('data-id');

                            showConfirmationModal(targetId);
                        });
                    });
                });

            } catch (error) {
                console.error('Error fetching users:', error);
            }
        }


        // Fetch and display disabled users
        async function fetchDisabledStudents() {
            try {
                const querySnapshot = await getDocs(collection(db, 'users'));
                tableText.style.display = 'block';
                usersTableBody.innerHTML = ''; // Clear existing table rows
                querySnapshot.forEach((doc) => {
                    const userData = doc.data();

                    if (userData.isActive === "false") {
                        // Create a table row for each user
                        const row = `
                            <tr class="user-row" data-email="${userData.Email}">
                                <td><span class="styled-name">${userData.Name}</span></td>
                                <td>${userData.Institution}</td>
                                <td>${userData.Level}</td>
                                <td>
                                    <p class="text-danger fw-semibold" style="display: inline;">Disabled</p>
                                    <img src="images/icons8-edit.svg" title="enable student" alt="disable icon" 
                                    class="disable-icon" data-id="${userData.MatricNo}" style="display: inline;">
                                </td>      
                                <!-- Add more fields as necessary -->
                            </tr>`;


                        // Insert the row into the table body
                        tableText.style.display = 'none';
                        usersTableBody.insertAdjacentHTML('beforeend', row);
                    }

                    // Add click event listeners to each row
                    document.querySelectorAll('.user-row').forEach(row => {
                        row.addEventListener('click', async (e) => {
                            // Get the email from the row's data attribute
                            const userEmail = row.getAttribute('data-email');

                            // Fetch the user ID using the email
                            const userId = await getUserIdAsync(userEmail);

                            if (userId) {
                                // Store the userId in sessionStorage or localStorage
                                sessionStorage.setItem('selectedUserId', userId);
                                // Redirect to the user details page
                                window.location.href = '/admin-user-details.html';
                            } else {
                                console.log("User not found.");
                            }
                        });
                    });

                    // Now that all rows have been inserted, attach click event listeners to all disable icons
                    const disableIcons = document.querySelectorAll('.disable-icon');

                    disableIcons.forEach((icon) => {
                        icon.addEventListener('click', (e) => {
                            e.stopPropagation();
                            // Get the email from the clicked image's data attribute
                            const targetId = icon.getAttribute('data-id');

                            showEnableConfirmationModal(targetId);
                        });
                    });
                });

            } catch (error) {
                console.error('Error fetching users:', error);
            }
        }

        // Add a single event listener for the revoke button outside the row click handler
        document.getElementById('revokeBtn').addEventListener('click', async () => {
            const confirmRevocation = confirm("Are you sure you want to revoke this student's Approval?");
            
            if (confirmRevocation) {
                try {
                    const userId = document.getElementById('revokeBtn').getAttribute('data-user-id'); // Retrieve userId from the button's data attribute
                    
                    // Step 1: Update the user's approval status to "false"
                    await updateDoc(doc(db, 'users', userId), {
                        isApproved: "false",
                    });

                    // Step 2: Delete the record from the ApprovedUser collection
                    const userDocRef = await getDoc(doc(db, 'users', userId));
                    if (userDocRef.exists()) {
                        const userData = userDocRef.data();

                        // Find and delete the corresponding approval record from the ApprovedUser collection
                        const approvedUserSnapshot = await getDocs(query(collection(db, 'ApprovedUser'), where("StudentEmail", "==", userData.Email)));
                        
                        approvedUserSnapshot.forEach(async (doc) => {
                            // Delete the approval document
                            await deleteDoc(doc.ref);
                        });
                    }

                    alert("User approval revoked.");

                    // Step 3: Close the modal after revoking
                    const userModal = bootstrap.Modal.getInstance(document.getElementById('userModal'));
                    userModal.hide();

                    // Step 4: Remove the user row from the table
                    const userRow = document.querySelector(`tr[data-user-id="${userId}"]`);
                    if (userRow) {
                        userRow.remove();
                    }

                } catch (error) {
                    console.error("Error revoking approval: ", error);
                }
            } else {
                // Stay on the modal if the user cancels the revocation
                console.log("Revocation canceled by user.");
            }
        });


        // Fetch and display Approved students
        async function fetchApprovedStudents() {
            try {
                const querySnapshot = await getDocs(collection(db, 'users'));
                usersTableBody.innerHTML = ''; // Clear existing table rows

                for (const doc of querySnapshot.docs) {
                    const userData = doc.data();
                    const userId = doc.id;  // Get the document ID (which might not be the same as the email)

                    // Check if user is approved and active
                    if (userData.isApproved === "true" && userData.isActive === "true") {

                        // Fetch the corresponding approval info from the ApprovedUser collection
                        const approvedUserSnapshot = await getDocs(query(collection(db, 'ApprovedUser'), where("StudentEmail", "==", userData.Email)));

                        let approvedBy = 'N/A';  // Default value in case no approval info is found
                        let approvalDate = 'N/A'; // Default value in case no approval info is found
                        let remarks = 'N/A'; // Default value for remarks

                        if (!approvedUserSnapshot.empty) {
                            const approvedUserData = approvedUserSnapshot.docs[0].data();  // Get the first matching approval record
                            approvedBy = approvedUserData.AdminEmail || 'N/A'; // Fetch admin email
                            remarks = approvedUserData.Remarks || 'N/A'; // Fetch remarks if available

                            // Use Moment.js to format the Firestore timestamp
                            if (approvedUserData.createdAt) {
                                const timestamp = moment(approvedUserData.createdAt.toDate());
                                approvalDate = timestamp.format('DD-MM-YYYY'); // Format date as "DD-MM-YYYY"
                            }
                        }

                        // Create a table row for each approved user
                        const row = `
                            <tr class="user-row" data-user-id="${userId}" 
                                data-name="${userData.Name}" 
                                data-institution="${userData.Institution}" 
                                data-level="${userData.Level}" 
                                data-approvedBy='${approvedBy}' 
                                data-approvalDate='${approvalDate}' 
                                data-remarks='${remarks}'>
                                <td><span class="styled-name">${userData.Name}</span></td>
                                <td>${userData.Institution}</td>
                                <td>${userData.Level}</td>
                                <td>${approvedBy}</td>  <!-- Approved By (Admin Email) -->
                                <td>${approvalDate}</td>
                                <td></td>
                            </tr>`;

                        // Insert the row into the table body
                        tableText.style.display = 'none';
                        usersTableBody.insertAdjacentHTML('beforeend', row);
                    }
                }

                // Add click event listeners to rows
                document.querySelectorAll('.user-row').forEach(row => {
                    row.addEventListener('click', function () {
                        const userId = this.getAttribute('data-user-id');
                        const name = this.getAttribute('data-name');
                        const institution = this.getAttribute('data-institution');
                        const level = this.getAttribute('data-level');
                        const approvedBy = this.getAttribute('data-approvedBy');
                        const approvalDate = this.getAttribute('data-approvalDate');
                        const remarks = this.getAttribute('data-remarks');

                        // Populate modal with user data
                        document.getElementById('userName').value = name;
                        document.getElementById('userInstitution').value = institution;
                        document.getElementById('userLevel').value = level;
                        document.getElementById('approvedBy').value = approvedBy;
                        document.getElementById('approvalDate').value = approvalDate;
                        document.getElementById('remarks').value = remarks; // Populate remarks in the modal

                        // Set the userId in the revoke button's data attribute
                        document.getElementById('revokeBtn').setAttribute('data-user-id', userId);

                        // Show the modal
                        const userModal = new bootstrap.Modal(document.getElementById('userModal'));
                        userModal.show();
                    });
                });
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        }


        function showConfirmationModal(targetId) {
            const confirmModal = document.querySelector('#confirmModal');
            confirmModal.style.display = "block";  // Show the confirmation modal

            // Handle Yes button click
            document.querySelector('#confirmYes').onclick = function () {
                disableStudent(targetId);  // Call your function to disable the admin
                confirmModal.style.display = "none";  // Hide the confirmation modal
            };

            // Handle No button click
            document.querySelector('#confirmNo').onclick = function () {
                confirmModal.style.display = "none"; // Hide the confirmation modal without taking action
            };
        }

        function showEnableConfirmationModal(targetId) {
            const confirmEnableModal = document.querySelector('#confirmEnableModal');
            confirmEnableModal.style.display = "block";  // Show the confirmation modal

            // Handle Yes button click
            document.querySelector('#confirmEnableYes').onclick = function () {
                enableStudent(targetId);  // Call your function to disable the admin
                confirmEnableModal.style.display = "none";  // Hide the confirmation modal
            };

            // Handle No button click
            document.querySelector('#confirmEnableNo').onclick = function () {
                confirmEnableModal.style.display = "none"; // Hide the confirmation modal without taking action
            };
        }

        async function disableStudent(targetId) {
            try {
                // Query the 'admin' collection to find the document by email
                const querySnapshot = await getDocs(
                    query(collection(db, 'users'), where('MatricNo', '==', targetId))
                );

                if (!querySnapshot.empty) {
                    const userDoc = querySnapshot.docs[0];  // Assuming email is unique, so get the first doc
                    const userRef = userDoc.ref;

                    // Update the 'isActive' field to false
                    await updateDoc(userRef, {
                        isActive: "false"
                    });

                    // Log success and remove the user from the table
                    console.log(`Student with Id ${targetId} has been disabled.`);

                    // Remove the user from the active table
                    removeStudentFromTable(targetId);

                    // Show success modal (if required)
                    const successModal = document.querySelector('#successModal');
                    successModal.style.display = 'block';

                    // Handle No button click
                    document.querySelector('#successOk').onclick = function () {
                        successModal.style.display = "none"; // Hide the confirmation modal without taking action
                    };
                } else {
                    console.log('Admin not found in Firestore.');
                }
            } catch (error) {
                console.error('Error disabling admin:', error);
            }
        }

        async function enableStudent(targetId) {
            try {
                // Query the 'admin' collection to find the document by email
                const querySnapshot = await getDocs(
                    query(collection(db, 'users'), where('MatricNo', '==', targetId))
                );

                if (!querySnapshot.empty) {
                    const userDoc = querySnapshot.docs[0];  // Assuming email is unique, so get the first doc
                    const userRef = userDoc.ref;

                    // Update the 'isActive' field to false
                    await updateDoc(userRef, {
                        isActive: "true"
                    });

                    // Log success and remove the user from the table
                    console.log(`Student with Id ${targetId} has been disabled.`);

                    // Remove the user from the active table
                    removeStudentFromTable(targetId);

                    // Show success modal (if required)
                    const successEnableModal = document.querySelector('#successEnableModal');
                    successEnableModal.style.display = 'block';

                    // Handle No button click
                    document.querySelector('#successEnableOk').onclick = function () {
                        successEnableModal.style.display = "none"; // Hide the confirmation modal without taking action
                    };
                } else {
                    console.log('Admin not found in Firestore.');
                }
            } catch (error) {
                console.error('Error disabling admin:', error);
            }
        }

        function removeStudentFromTable(targetId) {
            // Find the row containing the target email within the table body
            const rows = usersTableBody.querySelectorAll('.user-row');

            rows.forEach((row) => {
                const idCell = row.querySelector('[data-id]');
                if (idCell && idCell.getAttribute('data-id') === targetId) {
                    // Remove the row from the table body
                    row.remove();
                }
            });
        }

        const studentDropdown = document.querySelector('#studentDropdown');
        // Add event listener to the dropdown
        studentDropdown.addEventListener('change', function () {
            const selectedOption = this.value;
            const approvedByHeader = document.querySelector('th.approved-by-header');  // Select the "Approved By" column header
            const dateHeader = document.querySelector('th.date-header');  // Select the "Date" column header

            if (selectedOption === 'Active Students') {
                fetchActiveStudents();  // Fetch and display active students
                approvedByHeader.classList.add('d-none');
                dateHeader.classList.add('d-none');
            } else if (selectedOption === 'Disabled Students') {
                fetchDisabledStudents();  // Fetch and display disabled students
                approvedByHeader.classList.add('d-none');
                dateHeader.classList.add('d-none');
            } else if (selectedOption === 'Approved Students') {
                approvedByHeader.classList.remove('d-none');
                dateHeader.classList.remove('d-none');
                fetchApprovedStudents(); // Fetch and display Approved Students
            }
        });

        // Function to search for an active user by name and status
        async function searchActiveUsers(name) {
            try {
                // Clear the table body before showing the search result
                usersTableBody.innerHTML = '';

                // Reference to the "users" collection
                const usersCollection = collection(db, "users");

                // Build a query to search for the name (case-insensitive)
                const q = query(usersCollection, where("isActive", "==", "true"),
                    where("Name", ">=", name.toUpperCase()),
                    where("Name", "<=", name.toUpperCase() + "\uf8ff"));

                // Execute the query and get the documents
                const querySnapshot = await getDocs(q);

                // Check if any documents are found
                if (!querySnapshot.empty) {
                    querySnapshot.forEach((doc) => {
                        const userData = doc.data();

                        // Create a table row for each user
                        const row = `
                            <tr class="user-row" data-email="${userData.Email}">
                                <td><span class="styled-name">${userData.Name}</span></td>
                                <td>${userData.Institution}</td>
                                <td>${userData.Level}</td>
                                 <td>
                                    <p class="text-success fw-semibold" style="display: inline;">Active</p>
                                    <img src="images/icons8-edit.svg" title="enable student" alt="disable icon" 
                                    class="disable-icon" data-id="${userData.MatricNo}" style="display: inline;">
                                </td>
                                <!-- Add more fields as necessary -->
                            </tr>`;

                        // Append the matching user row to the table
                        usersTableBody.insertAdjacentHTML('beforeend', row);

                        // Add click event listeners to each row
                        document.querySelectorAll('.user-row').forEach(row => {
                            row.addEventListener('click', async (e) => {
                                // Get the email from the row's data attribute
                                const userEmail = row.getAttribute('data-email');

                                // Fetch the user ID using the email
                                const userId = await getUserIdAsync(userEmail);

                                if (userId) {
                                    // Store the userId in sessionStorage or localStorage
                                    sessionStorage.setItem('selectedUserId', userId);
                                    // Redirect to the user details page
                                    window.location.href = '/admin-user-details.html';
                                } else {
                                    console.log("User not found.");
                                }
                            });
                        });

                        // Now that all rows have been inserted, attach click event listeners to all disable icons
                        const disableIcons = document.querySelectorAll('.disable-icon');

                        disableIcons.forEach((icon) => {
                            icon.addEventListener('click', (e) => {
                                e.stopPropagation();
                                // Get the email from the clicked image's data attribute
                                const targetId = icon.getAttribute('data-id');

                                showConfirmationModal(targetId);
                            });
                        });
                    });
                } else {
                    alert("No Active user found with the name: " + name);
                }
            } catch (error) {
                console.error("Error searching for user by name: ", error);
            }
        }


        // Function to search for an disabled user by name and status
        async function searchDisabledUsers(name) {
            try {
                // Clear the table body before showing the search result
                usersTableBody.innerHTML = '';

                // Reference to the "users" collection
                const usersCollection = collection(db, "users");

                // Build a query to search for the name (case-insensitive)
                const q = query(usersCollection, where("isActive", "==", "false"),
                    where("Name", ">=", name.toUpperCase()),
                    where("Name", "<=", name.toUpperCase() + "\uf8ff"));

                // Execute the query and get the documents
                const querySnapshot = await getDocs(q);

                // Check if any documents are found
                if (!querySnapshot.empty) {
                    querySnapshot.forEach((doc) => {
                        const userData = doc.data();

                        // Create a table row for each user
                        const row = `
                            <tr class="user-row" data-email="${userData.Email}">
                                <td><span class="styled-name">${userData.Name}</span></td>
                                <td>${userData.Institution}</td>
                                <td>${userData.Level}</td>
                                <td>
                                    <p class="text-danger fw-semibold" style="display: inline;">Disabled</p>
                                    <img src="images/icons8-edit.svg" title="enable student" alt="disable icon" 
                                    class="disable-icon" data-id="${userData.MatricNo}" style="display: inline;">
                                </td>
                                <!-- Add more fields as necessary -->
                            </tr>`;

                        // Append the matching user row to the table
                        usersTableBody.insertAdjacentHTML('beforeend', row);

                        // Add click event listeners to each row
                        document.querySelectorAll('.user-row').forEach(row => {
                            row.addEventListener('click', async (e) => {
                                // Get the email from the row's data attribute
                                const userEmail = row.getAttribute('data-email');

                                // Fetch the user ID using the email
                                const userId = await getUserIdAsync(userEmail);

                                if (userId) {
                                    // Store the userId in sessionStorage or localStorage
                                    sessionStorage.setItem('selectedUserId', userId);
                                    // Redirect to the user details page
                                    window.location.href = '/admin-user-details.html';
                                } else {
                                    console.log("User not found.");
                                }
                            });
                        });

                        // Now that all rows have been inserted, attach click event listeners to all disable icons
                        const disableIcons = document.querySelectorAll('.disable-icon');

                        disableIcons.forEach((icon) => {
                            icon.addEventListener('click', (e) => {
                                e.stopPropagation();
                                // Get the email from the clicked image's data attribute
                                const targetId = icon.getAttribute('data-id');

                                showEnableConfirmationModal(targetId);
                            });
                        });
                    });
                } else {
                    alert("No Disabled user found with the name: " + name);
                }
            } catch (error) {
                console.error("Error searching for user by name: ", error);
            }
        }

        // Function to search for a user by name and status
        async function searchApprovedUsers(name) {
            try {
                // Clear the table body before showing the search result
                usersTableBody.innerHTML = '';

                // Reference to the "users" collection
                const usersCollection = collection(db, "users");

                // Build a query to search for the name (case-insensitive)
                const q = query(usersCollection, where("isApproved", "==", "true"), where("isActive", "==", "true"),
                    where("Name", ">=", name.toUpperCase()),
                    where("Name", "<=", name.toUpperCase() + "\uf8ff"));

                // Execute the query and get the documents
                const querySnapshot = await getDocs(q);

                // Check if any documents are found
                if (!querySnapshot.empty) {
                    querySnapshot.forEach(async (doc) => {
                        const userData = doc.data();
                        const userId = doc.id;  // Get the document ID (which might not be the same as the email)

                        // Fetch the corresponding approval info from the ApprovedUser collection
                        const approvedUserSnapshot = await getDocs(query(collection(db, 'ApprovedUser'), where("StudentEmail", "==", userData.Email)));

                        let approvedBy = 'N/A';  // Default value in case no approval info is found
                        let approvalDate = 'N/A'; // Default value in case no approval info is found
                        let remarks = 'N/A'; // Default value for remarks

                        if (!approvedUserSnapshot.empty) {
                            const approvedUserData = approvedUserSnapshot.docs[0].data();  // Get the first matching approval record
                            approvedBy = approvedUserData.AdminEmail || 'N/A'; // Fetch admin email
                            remarks = approvedUserData.Remarks || 'N/A'; // Fetch remarks if available

                            // Use Moment.js to format the Firestore timestamp
                            if (approvedUserData.createdAt) {
                                const timestamp = moment(approvedUserData.createdAt.toDate());
                                approvalDate = timestamp.format('DD-MM-YYYY'); // Format date as "DD-MM-YYYY"
                            }
                        }

                        // Create a table row for each user
                        const row = `
                            <tr class="user-row" data-user-id="${userId}" 
                                data-name="${userData.Name}" 
                                data-institution="${userData.Institution}" 
                                data-level="${userData.Level}" 
                                data-approvedBy='${approvedBy}' 
                                data-approvalDate='${approvalDate}' 
                                data-remarks='${remarks}'>
                                <td><span class="styled-name">${userData.Name}</span></td>
                                <td>${userData.Institution}</td>
                                <td>${userData.Level}</td>
                                <td>${approvedBy}</td>  <!-- Approved By (Admin Email) -->
                                <td>${approvalDate}</td>
                                <td></td>
                            </tr>`;

                        // Append the matching user row to the table
                        usersTableBody.insertAdjacentHTML('beforeend', row);

                        // Add click event listeners to each row
                        document.querySelectorAll('.user-row').forEach(row => {
                            row.addEventListener('click', async (e) => {
                                const clickedRow = e.currentTarget;  // Use e.currentTarget to reference the clicked row

                                const userId = clickedRow.getAttribute('data-user-id');
                                const name = clickedRow.getAttribute('data-name');
                                const institution = clickedRow.getAttribute('data-institution');
                                const level = clickedRow.getAttribute('data-level');
                                const approvedBy = clickedRow.getAttribute('data-approvedBy');
                                const approvalDate = clickedRow.getAttribute('data-approvalDate');
                                const remarks = clickedRow.getAttribute('data-remarks');

                                // Populate modal with user data
                                document.getElementById('userName').value = name;
                                document.getElementById('userInstitution').value = institution;
                                document.getElementById('userLevel').value = level;
                                document.getElementById('approvedBy').value = approvedBy;
                                document.getElementById('approvalDate').value = approvalDate;
                                document.getElementById('remarks').value = remarks; // Populate remarks in the modal

                                // Set the userId in the revoke button's data attribute
                                document.getElementById('revokeBtn').setAttribute('data-user-id', userId);

                                // Show the modal
                                const userModal = new bootstrap.Modal(document.getElementById('userModal'));
                                userModal.show();
                            });
                        });
                    });
                } else {
                    alert("No Approved user found with the name: " + name);
                }
            } catch (error) {
                console.error("Error searching for user by name: ", error);
            }
        }


        const searchBtn = document.querySelector('.searchBtn');
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();

            // Get the value from the search input field
            const name = document.querySelector('.searchBox').value;

            const status = document.getElementById('studentDropdown').value; // Get the selected status from the dropdown

            if (name) {
                if (status === 'Active Students') {
                    searchActiveUsers(name);
                } else if (status === 'Disabled Students') {
                    searchDisabledUsers(name);
                } else if (status === 'Approved Students') {
                    searchApprovedUsers(name);
                }
            } else {
                alert("Please enter a name to search.");
            }
        });
    };
}

{
    // New Admins Page
    const newAdminPage = document.querySelector('.admin-list');
    const adminTableBody = document.querySelector('.admin-table-body');
    const tableText = document.querySelector('.table-text');

    if (newAdminPage) {
        checkAdminAuth();

        // Calling the data on page load
        fetchActiveUsers();

        // Fetch and display Active users
        async function fetchActiveUsers() {
            try {
                const querySnapshot = await getDocs(collection(db, 'admin'));
                adminTableBody.innerHTML = ''; // Clear existing table rows
                querySnapshot.forEach((doc) => {
                    const adminData = doc.data();

                    // Create a table row for each active user
                    if (adminData.isActive === "true") {
                        const row = `
                        <tr class="user-row">
                            <td><span class="styled-name">${adminData.Name}</span></td>
                            <td>${adminData.Email}</td>
                            <td>${adminData.role}</td>
                            <td>
                                <p class="text-success fw-semibold" style="display: inline;">Active</p>
                                <img src="images/icons8-edit.svg" title="disable admin" alt="disable icon" class="disable-icon" data-email="${adminData.Email}" data-role="${adminData.role}" style="display: inline;">
                            </td>
                            <!-- Add more fields as necessary -->
                        </tr>`;
                        // Insert the row into the table body
                        tableText.style.display = "none";
                        adminTableBody.insertAdjacentHTML('beforeend', row);
                    }
                });
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        }

        // Event delegation: Listen for clicks on disable icons using the parent table body
        adminTableBody.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('disable-icon')) {
                const targetEmail = e.target.getAttribute('data-email');
                const targetRole = e.target.getAttribute('data-role');
                handleDisableUser(targetEmail, targetRole);
            }
        });

        const adminDropdown = document.querySelector('#adminDropdown');
        // Add event listener to the dropdown
        adminDropdown.addEventListener('change', function () {
            const selectedOption = this.value;

            if (selectedOption === 'Active Admins') {
                fetchActiveUsers();  // Fetch and display active Admins
            } else if (selectedOption === 'Disabled Admins') {
                fetchDisabledUsers();  // Fetch and display disabled Admins
            }
        });

        // Fetch and display disabled users
        async function fetchDisabledUsers() {
            try {
                const querySnapshot = await getDocs(collection(db, 'admin'));
                tableText.style.display = "block";
                adminTableBody.innerHTML = ''; // Clear existing table rows
                querySnapshot.forEach((doc) => {
                    const adminData = doc.data();

                    // Create a table row for each disabled user
                    if (adminData.isActive === "false") {
                        const row = `
                        <tr class="user-row">
                            <td><span class="styled-name">${adminData.Name}</span></td>
                            <td>${adminData.Email}</td>
                            <td>${adminData.role}</td>
                            <td>
                                <p class="text-danger fw-semibold" style="display: inline;">Disabled</p>
                                <img src="images/icons8-edit.svg" title="enable admin" alt="enable icon" class="enable-icon" data-email="${adminData.Email}" data-role="${adminData.role}" style="display: inline;">
                            </td>
                            <!-- Add more fields as necessary -->
                        </tr>`;
                        // Insert the row into the table body
                        tableText.style.display = "none";
                        adminTableBody.insertAdjacentHTML('beforeend', row);
                    }
                });
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        }

        // Event delegation for enabling users
        adminTableBody.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('enable-icon')) {
                const targetEmail = e.target.getAttribute('data-email');
                const targetRole = e.target.getAttribute('data-role');
                handleEnableUser(targetEmail, targetRole);
            }
        });

        // Function to get the current user's role using email and then apply role-based conditions for disabling
        async function handleDisableUser(targetEmail, targetRole) {
            const currentUser = auth.currentUser;  // Get the logged-in user

            if (currentUser) {
                const userEmail = currentUser.email;  // Get the logged-in user's email

                // Query Firestore to get the logged-in user's role
                const querySnapshot = await getDocs(
                    query(collection(db, 'admin'), where('Email', '==', userEmail))
                );

                if (!querySnapshot.empty) {
                    const adminDoc = querySnapshot.docs[0];
                    const adminData = adminDoc.data();
                    const currentUserRole = adminData.role;  // Current user's role

                    // Apply permission checks based on the current user's role
                    if (currentUserRole === 'MODERATOR') {
                        alert('You do not have permission to disable any user.');
                        return;
                    }

                    if (currentUserRole === 'ADMIN' && (targetRole === 'ADMIN' || targetRole === 'SUPER ADMIN')) {
                        alert('You cannot disable fellow admins or super admins.');
                        return;
                    }

                    // Super admins can disable anyone, and admins can disable moderators
                    showConfirmationModal(targetEmail);  // Show modal if the action is allowed
                } else {
                    console.log('No user document found for this email.');
                    window.location.href = '/admin-login.html';
                }
            } else {
                console.log('No user is logged in.');
                window.location.href = '/admin-login.html';
            }
        }

        // Function to handle enabling a user
        async function handleEnableUser(targetEmail, targetRole) {
            const currentUser = auth.currentUser;  // Get the logged-in user

            if (currentUser) {
                const userEmail = currentUser.email;  // Get the logged-in user's email

                // Query Firestore to get the logged-in user's role
                const querySnapshot = await getDocs(
                    query(collection(db, 'admin'), where('Email', '==', userEmail))
                );

                if (!querySnapshot.empty) {
                    const adminDoc = querySnapshot.docs[0];
                    const adminData = adminDoc.data();
                    const currentUserRole = adminData.role;  // Current user's role

                    // Apply permission checks based on the current user's role
                    if (currentUserRole === 'MODERATOR') {
                        alert('You do not have permission to enable any user.');
                        return;
                    }

                    if (currentUserRole === 'ADMIN' && (targetRole === 'ADMIN' || targetRole === 'SUPER ADMIN')) {
                        alert('You cannot enable fellow admins or super admins.');
                        return;
                    }

                    // Super admins can enable anyone, and admins can enable moderators
                    showEnableConfirmationModal(targetEmail);  // Show modal if the action is allowed
                } else {
                    console.log('No user document found for this email.');
                    window.location.href = '/admin-login.html';
                }
            } else {
                console.log('No user is logged in.');
                window.location.href = '/admin-login.html';
            }
        }

        function showConfirmationModal(targetEmail) {
            const confirmModal = document.querySelector('#confirmModal');
            confirmModal.style.display = "block";  // Show the confirmation modal

            // Handle Yes button click
            document.querySelector('#confirmYes').onclick = function () {
                disableAdmin(targetEmail);  // Call your function to disable the admin
                confirmModal.style.display = "none";  // Hide the confirmation modal
            };

            // Handle No button click
            document.querySelector('#confirmNo').onclick = function () {
                confirmModal.style.display = "none"; // Hide the confirmation modal without taking action
            };
        }

        function showEnableConfirmationModal(targetEmail) {
            const confirmEnableModal = document.querySelector('#confirmEnableModal');
            confirmEnableModal.style.display = "block";  // Show the confirmation modal

            // Handle Yes button click
            document.querySelector('#confirmEnableYes').onclick = function () {
                enableAdmin(targetEmail);  // Call your function to enable the admin
                confirmEnableModal.style.display = "none";  // Hide the confirmation modal
            };

            // Handle No button click
            document.querySelector('#confirmEnableNo').onclick = function () {
                confirmEnableModal.style.display = "none"; // Hide the confirmation modal without taking action
            };
        }

        async function disableAdmin(targetEmail) {
            try {
                // Query the 'admin' collection to find the document by email
                const querySnapshot = await getDocs(
                    query(collection(db, 'admin'), where('Email', '==', targetEmail))
                );

                if (!querySnapshot.empty) {
                    const adminDoc = querySnapshot.docs[0];  // Assuming email is unique
                    const adminRef = adminDoc.ref;

                    // Update the 'isActive' field to false
                    await updateDoc(adminRef, {
                        isActive: "false"
                    });

                    // Remove the user from the active table
                    removeAdminFromTable(targetEmail);

                    // Show success modal
                    const successModal = document.querySelector('#successModal');
                    successModal.style.display = 'block';

                    // Handle Ok button click
                    document.querySelector('#successOk').onclick = function () {
                        successModal.style.display = "none"; // Hide the confirmation modal
                    };
                } else {
                    console.log('Admin not found in Firestore.');
                }
            } catch (error) {
                console.error('Error disabling admin:', error);
            }
        }

        async function enableAdmin(targetEmail) {
            try {
                // Query the 'admin' collection to find the document by email
                const querySnapshot = await getDocs(
                    query(collection(db, 'admin'), where('Email', '==', targetEmail))
                );

                if (!querySnapshot.empty) {
                    const adminDoc = querySnapshot.docs[0];  // Assuming email is unique
                    const adminRef = adminDoc.ref;

                    // Update the 'isActive' field to true
                    await updateDoc(adminRef, {
                        isActive: "true"
                    });

                    // Remove the user from the disabled table
                    removeAdminFromTable(targetEmail);

                    // Show success modal
                    const successModal = document.querySelector('#successEnableModal');
                    successModal.style.display = 'block';

                    // Handle Ok button click
                    document.querySelector('#successEnableOk').onclick = function () {
                        successModal.style.display = "none"; // Hide the confirmation modal
                    };
                } else {
                    console.log('Admin not found in Firestore.');
                }
            } catch (error) {
                console.error('Error enabling admin:', error);
            }
        }

        function removeAdminFromTable(targetEmail) {
            // Find the row containing the target email within the table body
            const rows = adminTableBody.querySelectorAll('.user-row');

            rows.forEach((row) => {
                const emailCell = row.querySelector('[data-email]');
                if (emailCell && emailCell.getAttribute('data-email') === targetEmail) {
                    // Remove the row from the table body
                    row.remove();
                }
            });
        }

        // Handle the modal form submission
        const adminForm = document.querySelector('.admin-form');
        const signInBtn = document.querySelector('#signInBtn');

        if (adminForm) {
            signInBtn.addEventListener('click', async (e) => {
                e.preventDefault();  // Prevent default form submission

                const email = adminForm.email.value;
                const gender = adminForm.gender.value;
                const password = adminForm.password.value;
                const name = adminForm.name.value;
                const timezone = adminForm.timezone.value;
                const role = adminForm.Role.value;

                // Show the spinner before the sign-in process starts
                signInBtn.classList.add('loading');  // Add the loading class to show spinner

                try {        
                    const adminCollectionRef = collection(db, "admin");
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

                    // Add the new admin to Firestore
                    await addDoc(adminCollectionRef, {
                        Name: name,
                        Email: email,
                        Gender: gender,
                        Timezone: timezone,
                        role: role,
                        isActive: "true"
                    });

                    alert('Admin Added Successfully..Logging out to confirm the new Admin');
                    window.location.href = '/admin-login.html';

                    // Update the UI directly by adding the new admin row
                    const newRow = `
                    <tr class="user-row">
                        <td><span class="styled-name">${name}</span></td>
                        <td>${email}</td>
                        <td>${role}</td>
                    </tr>`;
                    adminTableBody.insertAdjacentHTML('beforeend', newRow);

                } catch (error) {
                    console.error('Error adding admin:', error.message);
                    alert('Error: ' + error.message);
                } finally {
                    signInBtn.classList.remove('loading');  // Remove the loading class in case of error
                }
            });
        }
    }
}

{
    // Admin User details page
    const userDetails = document.querySelector('.users-tasks');
    if (userDetails) {
        checkAdminAuth();

        // Get references to common elements
        const card1 = document.querySelector('.user-summary');
        const card2 = document.querySelector('.personal-info-wrapper');
        const card3 = document.querySelector('.company-wrapper');
        const splash = document.querySelector('.splash');
        const splash2 = document.querySelector('.splash-two');
        const splash3 = document.querySelector('.splash-three');
        const duration = 3000;

        const approveUserForm = document.querySelector('.approveUserForm');
        const taskBtn = document.querySelector('.task-button');
        const approvalBtn = document.querySelector('.approval-button');
        const approvedIcon = document.querySelector('.approve-icon');
        const disabledIcon = document.querySelector('.disabled-icon');
        const taskSummary = document.querySelector('#taskSummary');
        const closeBtn = document.querySelector('.close-button');
        const body = document.body;

        // Remove splash after a delay
        setTimeout(() => {
            splash.classList.add('remove-splash');
            splash2.classList.add('remove-splash');
            splash3.classList.add('remove-splash');
        }, duration);

        // Fetch the user ID from sessionStorage
        const userId = sessionStorage.getItem('selectedUserId');

        // Ensure user ID exists and one of the cards is present
        if (userId && (card1 || card2 || card3)) {
            // Display user and company details based on the userId
            if (card1 || card2) displayUserDetails(userId);
            if (card3) displayCompanyDetails(userId);

            // Display user tasks when the button is clicked
            if (taskBtn && taskSummary) {
                taskBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    taskSummary.classList.remove('hidden');
                    body.classList.add('no-scroll');
                    setTimeout(() => {
                        taskSummary.classList.add('show');
                    }, 10);

                    // Fetch and display user tasks
                    displayUserTasks(userId);
                });

                // Close task summary modal
                if (closeBtn) {
                    closeBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        taskSummary.classList.remove('show');
                        body.classList.remove('no-scroll');
                        setTimeout(() => {
                            taskSummary.classList.add('hidden');
                        }, 500);
                    });
                }
            }

            // Function to fetch and display user personal details
            async function displayUserDetails(userId) {
                try {
                    const docSnapshot = await getDoc(doc(db, 'users', userId));
                    if (docSnapshot.exists()) {
                        const userData = docSnapshot.data();

                        // Display personal info on card2
                        if (card2) {
                            document.querySelector('.name').textContent = userData.Name;
                            document.querySelector('.matricNo').textContent = userData.MatricNo;
                            document.querySelector('.gender').textContent = userData.Gender;
                            document.querySelector('.email').textContent = userData.Email;
                            document.querySelector('.school').textContent = userData.Institution;
                            document.querySelector('.level').textContent = userData.Level;
                            document.querySelector('.course').textContent = userData.Course;
                        }

                        // Display summary on card1
                        if (card1) {
                            const adminIcon = document.querySelector('.admin-icon');
                            adminIcon.src = userData.Gender === 'Male' ? "images/man.png" : "images/woman.png";
                            document.querySelector('.summary-name').textContent = userData.Name;
                            document.querySelector('.summary-school').textContent = userData.Institution;
                        }

                        // Listen for admin authentication
                        onAuthStateChanged(auth, (user) => {
                            if (user) {
                                const adminEmail = user.email;

                                // Check if user is already approved
                                if (userData.isApproved === "true" && userData.isActive === "true") {
                                    approvalBtn.style.display = 'none';  // Hide approve button
                                    approvedIcon.style.display = 'block';  // Show approved icon
                                } else if (userData.isActive === "false") {
                                    approvalBtn.style.display = 'none';  // Hide approve button
                                    disabledIcon.style.display = 'block';  // Show disabled icon
                                } else {
                                    // Handle user approval process
                                    if (approveUserForm) {
                                        approveUserForm.addEventListener('submit', async (e) => {
                                            e.preventDefault();
                                            const remarks = approveUserForm.remarks.value;
                                            await addDoc(collection(db, "ApprovedUser"), {
                                                Remarks: remarks,
                                                AdminEmail: adminEmail,
                                                StudentEmail: userData.Email,
                                                createdAt: serverTimestamp()
                                            });

                                            // Update user as approved
                                            await updateDoc(doc(db, 'users', userId), { isApproved: "true" });

                                            approvalBtn.style.display = 'none';  // Hide button
                                            approvedIcon.style.display = 'block';  // Show approved icon
                                            approveUserForm.style.display = 'none';
                                            alert('User has been approved.');
                                            const userModal = bootstrap.Modal.getInstance(document.getElementById('Task'));
                                            userModal.hide();  // Close the modal after revoking
                                        });
                                    };
                                }
                            }
                        });
                    } else {
                        console.error('No user found with the provided ID.');
                    }
                } catch (error) {
                    console.error('Error fetching user details:', error);
                }
            }

            // Function to fetch and display company details
            async function displayCompanyDetails(userId) {
                try {
                    const docSnapshot = await getDoc(doc(db, 'company', userId));
                    if (docSnapshot.exists()) {
                        const companyData = docSnapshot.data();
                        if (card3) {
                            document.querySelector('.companyname').textContent = companyData.companyName;
                            document.querySelector('.address').textContent = companyData.Address;
                            document.querySelector('.supervisor').textContent = companyData.Supervisor;
                        }
                        if (card1) {
                            document.querySelector('.summary-company').textContent = companyData.companyName;
                        }
                    } else {
                        console.error('No company found with the provided ID.');
                    }
                } catch (error) {
                    console.error('Error fetching company details:', error);
                }
            }

            // Function to fetch and display user tasks
            async function displayUserTasks(userId) {
                try {
                    const tasksCollectionRef = collection(db, 'Tasks', userId, 'UserTasks');
                    const querySnapshot = await getDocs(query(tasksCollectionRef, orderBy('createdAt', 'desc')));

                    const tasksTableBody = document.querySelector('.tasks-table-body');
                    const taskCountElement = document.querySelector('.task-count');
                    tasksTableBody.innerHTML = "";

                    let taskCount = 0;

                    querySnapshot.forEach((doc) => {
                        const taskData = doc.data();
                        taskCount++;

                        const createdAt = moment.unix(taskData.createdAt.seconds);  // Get the task creation time
                        const now = moment();  // Get the current time
                        const hoursDiff = now.diff(createdAt, 'hours');  // Calculate the difference in hours

                        let displayTime;

                        // If the task is created within the last 24 hours, show relative time, otherwise show timestamp
                        if (hoursDiff < 24) {
                            displayTime = createdAt.fromNow();  // Show relative time
                        } else {
                            displayTime = createdAt.format('D-M-YYYY');  // Format as D-M-YYYY without padding
                        }
                        const row = `
                        <tr>
                            <td>${taskData.Description}</td>
                            <td>${displayTime}</td>
                        </tr>`;
                        tasksTableBody.insertAdjacentHTML('beforeend', row);
                    });

                    if (taskCountElement) {
                        taskCountElement.textContent = `Total Tasks: ${taskCount}`;
                    }
                } catch (error) {
                    console.error('Error fetching tasks:', error);
                }
            }
        } else {
            console.error('No userId found in sessionStorage.');
        }
    }
}

{
    // Users Forgot Password Page
    const userResetForm = document.querySelector('.forgot');
    const resetBtn = document.querySelector('#resetBtn');

    if (userResetForm) {
        resetBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = userResetForm.email.value;

            // Show the spinner before the Password Reset process starts
            resetBtn.classList.add('loading');  // Add the loading class to show spinner

            try {
                const auth = getAuth();
                await sendPasswordResetEmail(auth, email);
                alert('Password reset email sent! Please check your inbox and proceed back to the Login Page.');

                // Redirect to login page after 1 seconds
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 1000);
            } catch (error) {
                console.error("Error sending password reset email:", error);
                alert('Error sending password reset email. Please try again.');
            } finally {
                resetBtn.classList.remove('loading');  // Remove the loading class in case of error
            };
        });
    }
}

{
    // Admin Forgot Password Page
    const adminResetForm = document.querySelector('.admin-forgot');
    const resetBtn = document.querySelector('#resetBtn');

    if (adminResetForm) {
        resetBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = adminResetForm.email.value;

            // Show the spinner before the Password Reset process starts
            resetBtn.classList.add('loading');  // Add the loading class to show spinner

            try {
                const auth = getAuth();
                await sendPasswordResetEmail(auth, email);

                // Show success message
                alert('Password reset email sent! Please check your inbox then proceed back to the Login Page.');
                
                // Redirect to admin login page after 1 seconds
                setTimeout(() => {
                    window.location.href = '/admin-login.html';
                }, 1000);
            } catch (error) {
                console.error("Error sending password reset email:", error);
                alert('Error sending password reset email. Please try again.');
            } finally {
                resetBtn.classList.remove('loading');  // Remove the loading class in case of error
            };
        });
    }
}


/**
 * Retrieves the user ID based on the provided email and saves a task under that user's ID.
 * 
 * @param {string} email - The email of the user to retrieve.
 * @returns {Promise<int>} - A Promise that resolves to the user's ID (as a string) if found, or `null` if no user is found.
 * 
 * The method returns a user's matricNo or ID if the user is found. 
 * If no user is found, the method returns 0. Additionally, the method saves 
 * a task for the user in the "Tasks" collection, using the user's ID as the document ID.
 */
async function getUserIdAsync(email) {
    const usersCollection = collection(db, "users");
    const q = query(usersCollection, where("Email", "==", email));
    const querySnapshot = await getDocs(q);

    let userId;
    if (!querySnapshot.empty) {
        querySnapshot.forEach((docSnapshot) => {
            userId = docSnapshot.id;
        });
        return userId;
    } else {
        return 0;
    }
}

// Function to check admin authentication
function checkAdminAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            console.error("No admin user is signed in. Redirecting to admin login.");
            window.location.href = '/admin-login.html';
            return;
        }

        // Get user email
        const userEmail = user.email;
        const genderIcon = document.querySelector('.gender-icon');

        try {
            // Check if the user is an admin
            const adminQuerySnapshot = await getDocs(
                query(collection(db, "admin"), where("Email", "==", userEmail))
            );

            if (!adminQuerySnapshot.empty) {
                const adminDoc = adminQuerySnapshot.docs[0];
                const adminData = adminDoc.data();

                if (["SUPER ADMIN", "ADMIN", "MODERATOR"].includes(adminData.role) && adminData.isActive === "true") {
                    // Grant admin access or redirect to admin dashboard
                    if (adminData.Gender === "Male") {
                        genderIcon.src = "images/man.png";
                    } else if (adminData.Gender === "Female") {
                        genderIcon.src = "images/woman.png";
                    }
                } else {
                    alert("Unauthorized admin user. Redirecting to admin login.");
                    window.location.href = '/admin-login.html';
                }
            } else {
                alert("Admin user not found. Redirecting to admin login.");
                window.location.href = '/admin-login.html';
            }
        } catch (error) {
            console.error("Error retrieving admin role:", error);
            window.location.href = '/admin-login.html'; // Redirect in case of error
        }
    });
}

// Function to check student authentication
function checkStudentAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            console.error("No student user is signed in. Redirecting to student login.");
            window.location.href = '/login.html';
            return;
        }

        // Get user email
        const userEmail = user.email;
        const genderIcon = document.querySelector('.gender-icon');

        try {
            // Check if the user is a student
            const studentQuerySnapshot = await getDocs(
                query(collection(db, "users"), where("Email", "==", userEmail))
            );

            if (!studentQuerySnapshot.empty) {
                const studentDoc = studentQuerySnapshot.docs[0];
                const studentData = studentDoc.data();

                if (studentData.Role === "STUDENT" && studentData.isActive === "true") {
                    // Grant student access or redirect to the student task page
                    if (studentData.Gender === "Male") {
                        genderIcon.src = "images/man.png";
                    } else if (studentData.Gender === "Female") {
                        genderIcon.src = "images/woman.png";
                    }
                } else {
                    console.error("Unauthorized student role.");
                    window.location.href = '/login.html';
                }
            } else {
                alert("Student user not found.");
                window.location.href = '/login.html';
            }
        } catch (error) {
            console.error("Error retrieving student role:", error);
            window.location.href = '/login.html'; // Redirect in case of error
        }
    });
}




