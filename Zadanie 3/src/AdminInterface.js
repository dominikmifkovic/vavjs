//Dominik Mifkovic
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
//interface pre admina
const AdminInterface = () => {
    const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    };
    const userID = parseInt(getCookie('userID'));
    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState({
      email: '',
      name: '',
      password: '',
      age: '',
    });
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    
    const fileInputRef = useRef(null);
    useEffect(() => {
      fetchUsers();
    }, []);

    const fetchUsers = async () => {
      try {
        const response = await axios.get('http://localhost:8080/getusers');
        setUsers(response.data.users);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    const addUser = async () => {
      try {
          if (!isLoggedIn()) {
              showErrorMessage();
              return;
            }
        const existingUser = users.find(u => u.email === newUser.email || u.name === newUser.name);
        if (existingUser) {
          setErrorMessage('User with the same email or name already exists.');
        } else {
          const response = await axios.post('http://localhost:8080/register', newUser);
          if (response.data.error) {
            setErrorMessage(response.data.error);
          } else {
            setNewUser({
              email: '',
              name: '',
              password: '',
              age: '',
            });
            fetchUsers();
            closePopup();
          }
        }
      } catch (error) {
        console.error('Error adding user:', error);
      }
    };

    const deleteUser = async (userID) => {
      try {
          if (!isLoggedIn()) {
              showErrorMessage();
              return;
            }
        await axios.delete(`http://localhost:8080/users/delete/${userID}`);
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    };

    const openPopup = () => {
      setIsPopupOpen(true);
    };

    const closePopup = () => {
      setIsPopupOpen(false);
      setErrorMessage('');
    };

    const handleInputChange = (key, value) => {
      setNewUser({ ...newUser, [key]: value });
    };

    const handleFileChange = async (e) => {
      const selectedFile = e.target.files[0];
      if (selectedFile) {
        importUsersCSV(selectedFile);
      }  
    };

      const handleImportClick = () => {
          fileInputRef.current.click();
      };

      const isLoggedIn = () => {
          const token = getCookie('token');
          return token && userID;
      };

      const showErrorMessage = () => {
          alert('User of this session has logged off, the page will now be reloaded.');
          window.location.reload();
      };

    const isFormValid = () => {
      return Object.values(newUser).every((value) => value.trim() !== '') && validateEmail(newUser.email);
    };

    const validateEmail = (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    const importUsersCSV = async (file) => {
      try {
          if (!isLoggedIn()) {
              showErrorMessage();
              return;
            }
      
          const fileReader = new FileReader();
          fileReader.onload = async (event) => {
              const csvData = event.target.result;
              const rows = csvData.split('\n');
      
              for (const row of rows) {
              const [email, name, password, age] = row.split(',').map((item) => item.trim());
              const userData = {
                  email,
                  name,
                  password,
                  age: parseInt(age),
              };
      
              await axios.post('http://localhost:8080/register', userData);
              fetchUsers();
              
              }
          };
              fileReader.readAsText(file);
          } catch (error) {
              console.error('Error importing users from CSV:', error);
          }
    };

    const exportUsersCSV = async () => {
      try {
          if (!isLoggedIn()) {
              showErrorMessage();
              return;
          }
          const csvData = users.map(user => `${user.email},${user.name},${user.password},${user.age}`).join("\n");
          const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          if (link.download !== undefined) {
              const url = URL.createObjectURL(blob);
              link.setAttribute('href', url);
              link.setAttribute('download', 'users.csv');
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
          }
          } catch (error) {
              console.error('Error exporting CSV:', error);
          }
    };

    const [newAd, setNewAd] = useState({
      imgLink: '',
      adLink: '',
    });

    const [isAdPopupOpen, setIsAdPopupOpen] = useState(false);

    const openAdPopup = () => {
      setIsAdPopupOpen(true);
    };

    const closeAdPopup = () => {
      setIsAdPopupOpen(false);
      setNewAd({
        imgLink: '',
        adLink: '',
      });
    };

    const handleAdInputChange = (key, value) => {
      setNewAd({ ...newAd, [key]: value });
    };

    const addOrUpdateAd = async () => {
      try {
        if (!isLoggedIn()) {
          showErrorMessage();
          return;
        }

        const response = await axios.post('http://localhost:8080/addOrUpdateAd', newAd);

        if (response.data.error) {
          console.error('Error adding/updating ad:', response.data.error);
        } else {
          closeAdPopup();
        }
      } catch (error) {
        console.error('Error adding/updating ad:', error);
      }
    };

    return (
      <div>
        <h2>Admin Interface</h2>
        <div>
              <button onClick={handleImportClick}>Import Users from CSV ⬆️</button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
              <button onClick={exportUsersCSV}>Export Users to CSV ⬇️</button>
              <button onClick={openAdPopup}>Add/Update Ad</button>
        </div>
        <div>
          <button onClick={openPopup}>Add User</button>
        </div>
        <div>
        <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Password</th>
                <th>Age</th>
                <th>Types</th>
                <th>Drive Count</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.password}</td>
                  <td>{user.age}</td>
                  <td>
                    {user.types.map((type) => (
                      <span key={type.typeID}>{type.label}, </span>
                    ))}
                  </td>
                  <td>{user.driveCount}</td>
                  <td>
                    <button onClick={() => deleteUser(user.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isPopupOpen && (
          <div className="popup-container">
            <div className="popup">
              <span className="close" onClick={closePopup}>
                &times;
              </span>
              <h3>Add User</h3>
              {errorMessage && <p className="error-message">{errorMessage}</p>}
              <label>Email: </label>
              <input
                type="text"
                value={newUser.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
              <br/>
              <label>Name: </label>
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
              <br/>
              <label>Password: </label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
              />
              <br/>
              <label>Age: </label>
              <input
                type="text"
                value={newUser.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
              />
              <br/>
              <button onClick={addUser} disabled={!isFormValid()}>
                Add User
              </button>
            </div>
          </div>
        )}
        {isAdPopupOpen && (
          <div className="popup-container">
            <div className="popup">
              <span className="close" onClick={closeAdPopup}>
                &times;
              </span>
              <h3>Add/Update Ad</h3>
              {/* ... (existing code) */}
              <label>Image Link: </label>
              <input
                type="text"
                value={newAd.imgLink}
                onChange={(e) => handleAdInputChange('imgLink', e.target.value)}
              />
              <br />
              <label>Ad Link: </label>
              <input
                type="text"
                value={newAd.adLink}
                onChange={(e) => handleAdInputChange('adLink', e.target.value)}
              />
              <br />
              <button onClick={addOrUpdateAd}>Add/Update Ad</button>
            </div>
          </div>
        )}
      </div>
    );
};
export default AdminInterface;