//Dominik Mifkovic
//cele uzivatelske rozhranie
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
//import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import './App.css';
Chart.register(...registerables);

const DriveManagement = () => {
    const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    };
    const currentDate = new Date().toISOString().split('T')[0];
    const userID = parseInt(getCookie('userID'));
    const [drives, setDrives] = useState([]);
    const [types, setTypes] = useState([]);
    const [showCharts, setShowCharts] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [userName, setUserName] = useState('');
    const [showTypeForm, setShowTypeForm] = useState(false);
    const [showDrivesTable, setShowDrivesTable] = useState(true);
    const [showTypesTable, setShowTypesTable] = useState(false);
    const [filterType, setFilterType] = useState('');
    const [filterChange, setFilterChange] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [chartData, setChartData] = useState(null);
    const [newDrive, setNewDrive] = useState({
        distance: 0,
        duration: 0,
        fuelConsumption: 0,
        creationDate: currentDate,
        userID: userID,
        typeID: null,
    });
    const [newType, setNewType] = useState({
        label: '',
        userID: userID,
    });
    const fileInputRef = useRef(null);
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`http://localhost:8080/drives/${userID}`);
                const drives = response.data.drives;
                const oldestDate = new Date(Math.min(...drives.map((drive) => new Date(drive.creationDate))));
                setStartDate(oldestDate.toISOString().split('T')[0]);
                const today = new Date();
                setEndDate(today.toISOString().split('T')[0]);
            } catch (error) {
                console.error('Error fetching initial data:', error);
            }
        };
        fetchData();
    }, []);
    
    useEffect(() => {
        fetchDrives();
        fetchUserName();
        fetchTypes();
    }, []);
    
    const closeAddUserPopup = () => {
        setShowForm(false);
    };

    const closeAddTypePopup = () => {
        setShowTypeForm(false);
    };

    const fetchDrives = async () => {
        try {
            if (!isLoggedIn()) {
                showErrorMessage();
                return;
            }
            const response = await axios.get(`http://localhost:8080/drives/${userID}`);
            setDrives(response.data.drives);
        } catch (error) {
            console.error('Error fetching drives:', error);
        }
    };

    const fetchUserName = async () => {
        try {
            const response = await axios.get(`http://localhost:8080/users/${userID}`);
            setUserName(response.data.name);
        } catch (error) {
            console.error('Error fetching user name:', error);
        }
    };

    const fetchTypes = async () => {
        try {
            const response = await axios.get(`http://localhost:8080/types/${userID}`);
            setTypes(response.data.types);
        } catch (error) {
            console.error('Error fetching types:', error);
        }
    };

    const addDrive = async () => {
        try {
            if (!isLoggedIn()) {
                showErrorMessage();
                return;
            }
            if(!newDrive.distance && !newDrive.duration && !newDrive.fuelConsumption){
                alert('Insert atleast one value!');
                return;
            }
            await axios.post('http://localhost:8080/drives/add', { ...newDrive, creationDate: currentDate });
            
            setNewDrive({
                distance: 0,
                duration: 0,
                fuelConsumption: 0,
                creationDate: currentDate,
                userID: userID,
                typeID: null,
            });
            fetchChartData();
            fetchDrives();
            setShowForm(false);
        } catch (error) {
            console.error('Error adding drive:', error);
        }
    };

    const deleteDrive = async (id) => {
        try {
            if (!isLoggedIn()) {
                showErrorMessage();
                return;
            }

            await axios.delete(`http://localhost:8080/drives/delete/${id}`);
            fetchChartData();
            fetchDrives();
        } catch (error) {
            console.error('Error deleting drive:', error);
        }
    };

    const addType = async () => {
        try {
            if (!isLoggedIn()) {
                showErrorMessage();
                return;
            }
            await axios.post('http://localhost:8080/types/add', newType);
            setNewType({
                label: '',
                userID: userID,
            });
            fetchTypes();
            setShowTypeForm(false);
        } catch (error) {
            console.error('Error adding type:', error);
        }
    };

    const deleteType = async (id) => {
        try {
            if (!isLoggedIn()) {
                showErrorMessage();
                return;
            }

            await axios.delete(`http://localhost:8080/types/delete/${id}`);
            fetchTypes();
        } catch (error) {
            console.error('Error deleting type:', error);
        }
    };

    const isLoggedIn = () => {
        const token = getCookie('token');
        return token && userID;
    };

    const showErrorMessage = () => {
        alert('User of this session has logged off, the page will now be reloaded.');
        window.location.reload();
    };


    const importCSV = async (file) => {
        try {
          if (!isLoggedIn()) {
            showErrorMessage();
            return;
          }
      
          const fileReader = new FileReader();
          fileReader.onload = async (event) => {
            const csvData = event.target.result;
            const rows = csvData.split('\n');
            const addedTypes = new Set();
      
            for (const row of rows) {
              const [date, value, type, driveType] = row.split(',').map((item) => item.trim());
              const driveData = {
                distance: type === 'Distance' ? parseFloat(value) : 0,
                duration: type === 'Duration' ? parseFloat(value) : 0,
                fuelConsumption: type === 'Fuel Consumption' ? parseFloat(value) : 0,
                creationDate: date,
                userID: userID,
                typeID: driveType, 
              };
      
              if (driveType && !addedTypes.has(driveType)) {
                const typeExists = types.some((existingType) => existingType.label === driveType);
                
                if (!typeExists) {
                  await axios.post('http://localhost:8080/types/add', { label: driveType, userID: userID });
                  addedTypes.add(driveType);
                  fetchTypes();
                }
              }
      
              await axios.post('http://localhost:8080/drives/add', driveData);
            }
            fetchChartData();
            fetchDrives(); 
          };
          fileReader.readAsText(file);
        } catch (error) {
          console.error('Error importing CSV:', error);
        }
    };

    const exportCSV = async () => {
        try {
          if (!isLoggedIn()) {
            showErrorMessage();
            return;
          }
      
          const response = await axios.get(`http://localhost:8080/drives/${userID}`);
          const drives = response.data.drives;
      
          const csvData = drives.map((drive) => {
            let value;
            let type;
      
            if (drive.distance !== 0) {
              value = drive.distance;
              type = 'Distance';
            } else if (drive.duration !== 0) {
              value = drive.duration;
              type = 'Duration';
            } else if (drive.fuelConsumption !== 0) {
              value = drive.fuelConsumption;
              type = 'Fuel Consumption';
            }
      
            return `${drive.creationDate}, ${value || ''}, ${type || ''}, ${drive.typeID ? drive.typeID : 'N/A'}`;
          });
      
          const csvContent = csvData.join('\n');
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
          const link = document.createElement('a');
          if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'drives.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        } catch (error) {
          console.error('Error exporting CSV:', error);
        }
      };

      const handleImportClick = () => {
        fileInputRef.current.click();
      };
    
      const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
          importCSV(selectedFile);
        }  
      };
    useEffect(async () => {
        await fetchChartData();
    }, [userID]);
    useEffect(async () => {
        if (filterChange) {
            await fetchChartData();
        setFilterChange(false);
        }
    }, [filterChange, userID]);
    useEffect(() => {
        fetchDrives();
        fetchUserName();
        fetchTypes();
    }, [filterType, startDate, endDate]);

    useEffect(async () => {
        await fetchChartData();
        if (chartData) {
            destroyCharts();
            createLinearRegressionChart(chartData.distance, 'Distance', 'Distance (km)', 'distanceChart');
            createLinearRegressionChart(chartData.duration, 'Duration', 'Duration (hours)', 'durationChart');
            createLinearRegressionChart(chartData.fuelConsumption, 'Fuel Consumption', 'Fuel Consumption (l/100km)', 'fuelConsumptionChart');
        }
    }, [filterType,filterChange,startDate, endDate]);

    const destroyCharts = () => {
        ['distanceChart', 'durationChart', 'fuelConsumptionChart'].forEach((chartId) => {
        const existingChart = Chart.getChart(chartId);
        if (existingChart) {
            existingChart.destroy();
        }
        });
    };

    const fetchChartData = async () => {
        try {
            const response = await axios.get(`http://localhost:8080/drives/${userID}`);
            const drives = response.data.drives;
            const filteredDrives = filterType || startDate || endDate ? applyFilters(drives, filterType, startDate, endDate) : drives;
            const processedData = processChartData(filteredDrives);
            setChartData(processedData);
        } catch (error) {
            console.error('Error fetching chart data:', error);
        }
    };

    const applyFilters = (drives, filterType, startDate, endDate) => {
        let filteredDrives = drives;
        if (filterType) {
            filteredDrives = filteredDrives.filter((drive) => drive.typeID === filterType);
        }
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            filteredDrives = filteredDrives.filter((drive) => {
                const driveDate = new Date(drive.creationDate);
                return driveDate >= start && driveDate <= end;
            });
        }
        return filteredDrives;
    };

    const handleFilterTypeChange = (e) => {
        setFilterType(e.target.value);
        setFilterChange(true);
    };
    
    const handleStartDateChange = (e) => {
        setStartDate(e.target.value);
        setFilterChange(true);
    };
    
    const handleEndDateChange = (e) => {
        setEndDate(e.target.value);
        setFilterChange(true);
    };
    
    const processChartData = (drives) => {
        const chartLabels = drives.map((drive) => drive.creationDate);
        const distanceData = drives.map((drive) => drive.distance);
        const durationData = drives.map((drive) => drive.duration);
        const fuelConsumptionData = drives.map((drive) => drive.fuelConsumption);

        return {
        labels: chartLabels,
        distance: distanceData,
        duration: durationData,
        fuelConsumption: fuelConsumptionData,
        };
    };

    const createLinearRegressionChart = (data, title, yLabel, containerId) => {
        const ctx = document.getElementById(containerId).getContext('2d');
        const regressionData = calculateLinearRegression(data);

        new Chart(ctx, {  
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: title,
                        type: 'scatter',
                        data: data.map((value, index) => ({ x: index, y: value })),
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                    },
                    {
                        label: 'Linear Regression',
                        type: 'line',
                        data: regressionData,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2,
                        fill: false,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Drives',
                        },
                    },
                    y: {
                        title: {
                            display: true,
                            text: yLabel,
                        },
                    },
                },
            },
        });
    };




    
    const calculateLinearRegression = (data) => {
        const n = data.length;
        const xSum = data.reduce((acc, _, index) => acc + index, 0);
        const ySum = data.reduce((acc, value) => acc + value, 0);
        const xySum = data.reduce((acc, value, index) => acc + index * value, 0);
        const xSquaredSum = data.reduce((acc, _, index) => acc + index * index, 0);
    
        const m = (n * xySum - xSum * ySum) / (n * xSquaredSum - xSum * xSum);
        const b = (ySum - m * xSum) / n;
    
        const regressionData = data.map((_, index) => ({ x: index, y: m * index + b }));
    
        return regressionData;
    };




    const handleShowGraphsClick = async () => {
        setShowCharts(true);
        await fetchChartData();
        await renderCharts();
        if (chartData) {
            createLinearRegressionChart(chartData.distance, 'Distance', 'Distance (km)', 'distanceChart');
            createLinearRegressionChart(chartData.duration, 'Duration', 'Duration (hours)', 'durationChart');
            createLinearRegressionChart(chartData.fuelConsumption, 'Fuel Consumption', 'Fuel Consumption (l/100km)', 'fuelConsumptionChart');
        }
    };

    const handleBackToDrivesClick = () => {
        setShowCharts(false);
    };

    const renderCharts = () => {
        if (showCharts) {
        return (
            <div>
                <div>
                <div className='button'>
                    <button onClick={handleBackToDrivesClick}>Manage Drives 🚗</button>
                </div>
                <div>
                    <label class="filter-label" for="filterType">Filter by Type:</label>
                    <select class="filter-select" id="filterType" value={filterType} onChange={handleFilterTypeChange}>
                    <option value="">All Types</option>
                    {types.map((type) => (
                        <option key={type.id} value={type.id}>
                        {type.label}
                        </option>
                    ))}
                    </select>
                    <label class="filter-label" for="startDate">Start Date:</label>
                    <input class="filter-input" type="date" id="startDate" value={startDate} onChange={handleStartDateChange} />
                    <label class="filter-label" for="endDate">End Date:</label>
                    <input class="filter-input" type="date" id="endDate" value={endDate} onChange={handleEndDateChange} />
                </div>
                </div>
                <div className='graphContainer'>
                    <div class="graphWrapper">
                    <canvas id="distanceChart"></canvas>
                    </div>
                    <div class="graphWrapper">
                    <canvas id="durationChart"></canvas>
                    </div>
                    <div class="graphWrapper">
                    <canvas id="fuelConsumptionChart"></canvas>
                    </div>
                </div>
            </div>
        );
        }
        return null;
    };

    const runEndToEndTests = async () => {
        try {
          sessionStorage.setItem("e2eID", userID);
          await axios.post('http://localhost:8080/run-tests');
          
        } catch (error) {
          console.error('Error running tests:', error);
        }
      };

    return (
        <div>
            <p>Current Logged User: {userName}</p>
            {showDrivesTable && !showCharts &&(
                <div className="container">
                    <h2>Drives Management</h2>
                    <div className="button">
                        <button onClick={() => { setShowTypesTable(true); setShowDrivesTable(false); }}>
                            Manage Drive Types ✏️
                        </button>
                        <button onClick={handleShowGraphsClick}>Show Graphs 📈</button>
                        <button onClick={handleImportClick}>Import Drives from CSV ⬆️</button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                        <button onClick={exportCSV}>Export Drives to CSV ⬇️</button>
                        <button onClick={runEndToEndTests}>Test e2e - check console</button>
                    </div>
                    <div className="button">
                        <button onClick={() => setShowForm(true)}>
                            Add drive
                        </button>
                    </div>
                    {showForm && (
                        <div className="popup-container">
                            <div className="popup">
                            <span className="close" onClick={closeAddUserPopup}>
                                &times;
                            </span>
                                <h3>Add New Drive</h3>
                                <label>Distance (km):</label>
                                <input
                                    type="double"
                                    value={newDrive.distance}
                                    onChange={(e) => setNewDrive({ ...newDrive, distance: e.target.value ? e.target.value : null })}
                                />
                                <br />
                                <label>Duration (hours):</label>
                                <input
                                    type="double"
                                    value={newDrive.duration}
                                    onChange={(e) => setNewDrive({ ...newDrive, duration: e.target.value ? e.target.value : null })}
                                />
                                <br />
                                <label>Fuel Consumption (l/100km):</label>
                                <input
                                    type="double"
                                    value={newDrive.fuelConsumption}
                                    onChange={(e) => setNewDrive({ ...newDrive, fuelConsumption: e.target.value ? e.target.value : null })}
                                />
                                <br />
                                <label>Type:</label>
                                <select
                                    value={newDrive.typeID || ''}
                                    onChange={(e) => setNewDrive({ ...newDrive, typeID: e.target.value })}
                                >
                                    <option defaultValue="">--------</option>
                                    {types.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                                <br />
                                <button onClick={addDrive}>Add Drive</button>
                            </div>
                        </div>
                    )}
                    <div className="table-container">
                        <h3>Drives List</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Distance (km)</th>
                                    <th>Duration (hours)</th>
                                    <th>Fuel Consumption (l/100km)</th>
                                    <th>Type</th>
                                    <th>Creation date</th>
                                    <th>Delete</th>
                                </tr>
                            </thead>
                            <tbody>
                                {drives.map((drive) => (
                                    <tr key={drive.id}>
                                        <td>{drive.id}</td>
                                        <td>{drive.distance}</td>
                                        <td>{drive.duration}</td>
                                        <td>{drive.fuelConsumption}</td>
                                        <td>{drive.typeID ? drive.typeID : 'N/A'}</td>
                                        <td>{drive.creationDate}</td>
                                        <td>
                                            <button onClick={() => deleteDrive(drive.id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {showCharts && (
                <div className="container">
                    <h2>Linear Regression Graphs</h2>  
                    <div>
                        {renderCharts()}
                    </div>
                </div>
            )}
            {showTypesTable && (
                <div className="container">
                    <h2>Type Management</h2>
                    <div className="button">
                        <button onClick={() => { setShowTypesTable(false); setShowDrivesTable(true); }}>
                            Manage Drives 🚗
                        </button>
                    </div>
                    <div className="button">
                        <button onClick={() => setShowTypeForm(true)}>
                            Add type
                        </button>
                    </div>
                    {showTypeForm && (
                        <div className="popup-container">
                            <div className="popup">
                                <span className="close" onClick={closeAddTypePopup}>
                                    &times;
                                </span>
                                <h3>Add New Type</h3>
                                <label>Label:</label>
                                <input
                                    type="text"
                                    value={newType.label}
                                    onChange={(e) => setNewType({ ...newType, label: e.target.value })}
                                />
                                <br />
                                <button onClick={addType}>Add Type</button>
                            </div>
                        </div>
                    )}
                    <div className="table-container">
                        <h3>Types List</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Label</th>
                                    <th>Delete</th>
                                </tr>
                            </thead>
                            <tbody>
                                {types.map((type) => (
                                    <tr key={type.typeID}>
                                        <td>{type.typeID}</td>
                                        <td>{type.label}</td>
                                        <td>
                                            <button onClick={() => deleteType(type.typeID)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );    
};
export default DriveManagement;
