//Dominik Mifkovic
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import DriveManagement from './DriveManagement';
import AdminInterface from './AdminInterface';
import './App.css';

const App = () => {
    const [loggedIn, setLoggedIn] = useState(false);
    const [registerPage, setRegisterPage] = useState(false);
    const [loading, setLoading] = useState(true);
    const [advertisement, setAdvertisement] = useState(null);
    useEffect(() => {
      const fetchAdvertisement = async () => {
        try {
          const response = await axios.get('http://localhost:8080/getAdvertisement');
          setAdvertisement(response.data);
        } catch (error) {
          console.error('Error fetching advertisement:', error);
        }
      };
      fetchAdvertisement();
      const intervalId = setInterval(fetchAdvertisement, 60000);//reklama sa obnovuje kazdu minutu
      return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
      const token = getCookie('token');
      const userID = parseInt(getCookie('userID'));
  
      if (token && userID) {
        setLoggedIn(true);
      }
  
      setLoading(false);
    }, []);
  
    const handleLogin = async (name, password) => {
        try {
          const response = await axios.post('http://localhost:8080/login', {
            name: name,
            password: password,
          });
      
          const { token, userID } = response.data;
          const existingUserID = parseInt(getCookie('userID'));
      
          if (existingUserID && existingUserID !== userID) {
            alert('Another user already logged in.');
            return;
          }
    
          setCookie('token', token);
          setCookie('userID', userID);
          setLoggedIn(true);
        } catch (error) {
          console.error('Login failed:', error);
          throw error;
        }
      };

    const handleRegister = async (email, name, password, age) => {
        try {
        await axios.post('http://localhost:8080/register', {
            email: email,
            name: name,
            password: password,
            age: age,
        });
        setRegisterPage(false);
        } catch (error) {
        console.error('Registration failed:', error);
        throw error;
        }
    };

    const handleLogout = () => {
        eraseCookie('token');
        eraseCookie('userID');
        setLoggedIn(false);
    };

    const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        console.log('value:', value);
        const parts = value.split(`; ${name}=`);
        console.log('parts:', parts);
        if (parts.length === 2) return parts.pop().split(';').shift();
        console.log('Returning undefined');
      };

    const setCookie = (name, value) => {
        document.cookie = `${name}=${value}; path=/`;
    };

    const eraseCookie = (name) => {
        document.cookie = `${name}=; Max-Age=-99999999;`;
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
    <div>
      {advertisement && (
            <div className="advertisement">
              <a href={advertisement.adLink} target="_blank" rel="noopener noreferrer">
                <img src={advertisement.imgLink} alt="Advertisement" />
              </a>
            </div>
          )}
      {loggedIn ? (
        <div className='container'>
        <button onClick={() => handleLogout()}>Logout</button>
          {getCookie('userID')==1 ? (
                <AdminInterface />
            ) : (
                <DriveManagement />
            )}
        </div>
      ) : (
        <div>
          {registerPage ? (
            <RegisterForm handleRegister={handleRegister} setRegisterPage={setRegisterPage} />
          ) : (
            <LoginForm handleLogin={handleLogin} setRegisterPage={setRegisterPage} />
          )}
        </div>
      )}
    </div>
  );
};

export default App;
