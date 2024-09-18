//Dominik Mifkovic
import React, { useState } from 'react';

const RegisterForm = ({ handleRegister, setRegisterPage }) => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [age, setAge] = useState('');
    const [error, setError] = useState('');

    const handleAgeChange = (e) => {
        const inputAge = parseInt(e.target.value, 10);
        if (!isNaN(inputAge)) {
        setAge(inputAge);
        }
    };

    const handleRegisterClick = async () => {
        if (!email || !name || !password || !age) {
            setError('Please fill in all fields.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Invalid email address.');
            return;
        }

        setError('');
        try {
            await handleRegister(email, name, password, age);
            setError('');
        } catch (error) {
            setError('User with this email or username already exists.');
        }
    };

    return (
        <div className="logRegContainer">
        <h2>Register</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <form>
            <label>Email:</label>
            <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} />
            <br />
            <label>Username:</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
            <br />
            <label>Password:</label>
            <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            />
            <br />
            <label>Age:</label>
            <input
            type="number"
            value={age}
            onChange={handleAgeChange}
            min="0"
            max="150"
            />
            <br />
            <button type="button" onClick={handleRegisterClick}>
            Register
            </button>
        </form>
        <p>
            Already have an account?{' '}
            <span style={{ color: 'blue', cursor: 'pointer' }} onClick={() => setRegisterPage(false)}>
            Login here
            </span>
            
        </p>
        </div>
    );
};

export default RegisterForm;
