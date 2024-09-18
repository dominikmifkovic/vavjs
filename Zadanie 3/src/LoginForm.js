//Dominik Mifkovic
import React, { useState } from 'react';

const LoginForm = ({ handleLogin, setRegisterPage }) => {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLoginClick = async () => {
        if (!name || !password) {
            setError('Please enter both username and password.');
            return;
        }
        try {
            await handleLogin(name, password);
            setError('');
        } catch (error) {
            setError('Invalid Username or password. Please try again.');
        }
    };

    return (
        <div className="logRegContainer">
        <h2>Login</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <form>
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
            <button type="button" onClick={handleLoginClick}>
            Login
            </button>
        </form>
        <p>
            Don't have an account?{' '}
            <span style={{ color: 'blue', cursor: 'pointer' }} onClick={() => setRegisterPage(true)}>
            Register here
            </span>
        </p>
        </div>
    );
};

export default LoginForm;
