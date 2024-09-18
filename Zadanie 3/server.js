//Dominik Mifkovic
const express = require('express');
const { Sequelize} = require('sequelize');
const { exec } = require('child_process');
const Docker = require('dockerode');// pridane cisto len kvoli e2e testom
const docker = new Docker();

const path = require('path');
const app = express();
const port = 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sequelize = new Sequelize('postgres://admin:admin@db:5432/vavjs_databaza', {
  	dialect: 'postgres',
});

const User = sequelize.define('User', {
	id: {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		primaryKey: true,
	},
	email: {
		type: Sequelize.STRING,
		allowNull: false,
		unique: true,
	},
	name: {
		type: Sequelize.STRING,
		allowNull: false,
	},
	password: {
		type: Sequelize.STRING,
		allowNull: false,
	},
	age: {
		type: Sequelize.INTEGER,
		allowNull: false,
	},
});

const Drive = sequelize.define('drive', {
	id: {
		type: Sequelize.INTEGER,
		primaryKey: true,
		autoIncrement: true,
	},
	distance: {
		type: Sequelize.DOUBLE,
		allowNull: true,
	},
	duration: {
		type: Sequelize.DOUBLE,
		allowNull: true,
	},
	fuelConsumption: {
		type: Sequelize.DOUBLE,
		allowNull: true,
	},
	creationDate: {
		type: Sequelize.DATEONLY
	},
	userID: {
		type: Sequelize.INTEGER,
	},
	typeID: {
		type: Sequelize.STRING,
	}
});

const Type = sequelize.define('type', {
	typeID: {
		type: Sequelize.INTEGER,
		primaryKey: true,
		autoIncrement: true,
	},
	label: {
		type: Sequelize.STRING,
	},
	userID: {
		type: Sequelize.INTEGER,
  	}
});

const Ad = sequelize.define('ad', {
	imgLink: {
		type: Sequelize.STRING,
		allowNull: false,
	},
	adLink: {
		type: Sequelize.STRING,
		allowNull: false,
	},
	counter: {
		type: Sequelize.INTEGER,
		defaultValue: 0,
	},
});


const seedDatabase = async () => {
	try {
		await sequelize.sync({ force: true });
		await User.create({
			email: 'admin@admin.com',
			name: 'admin',
			password: 'admin',
			age: 0,
		});

		const users = await User.bulkCreate([
			{ email: 'user1@test.com', name: 'user1', password: 'password1', age: 25 },
			{ email: 'user2@test.com', name: 'user2', password: 'password2', age: 26 },
			{ email: 'user3@test.com', name: 'user3', password: 'password3', age: 27 },
			{ email: 'user4@test.com', name: 'user4', password: 'password4', age: 28 },
			{ email: 'user5@test.com', name: 'user5', password: 'password5', age: 29 },
		]);

		const basicDriveTypes = ['Fuel efficient', 'Fast', 'Short'];

		for (const user of users) {
			basicDriveTypes.map((typeLabel) =>
			Type.create({
				label: typeLabel,
				userID: user.id,
			})
			);

		for (let i = 0; i < 5; i++) {
		const randomType = basicDriveTypes[Math.floor(Math.random() * basicDriveTypes.length)];
		const startDate = new Date('2015-01-01');
		const endDate = new Date();
		const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())).toISOString().split('T')[0];
		const drive = {
			distance: 0,
			duration: 0,
			fuelConsumption: 0,
			creationDate: randomDate,
			userID: user.id,
			typeID: randomType,
		};

		const randomIndex = Math.floor(Math.random() * 3);
		switch (randomIndex) {
			case 0:
				drive.distance = parseFloat(Math.random() * (600 - 1) + 1).toFixed(2);
			break;
			case 1:
				drive.duration = parseFloat(Math.random() * (20 - 0.2) + 0.2).toFixed(2);
			break;
			case 2:
				drive.fuelConsumption = parseFloat(Math.random() * (30 - 3.5) + 3.5).toFixed(2);
			break;
			default:
			break;
		}

		await Drive.create(drive);
		}
	}

		console.log('Database seeded successfully!');
	} catch (error) {
		console.error('Error seeding the database:', error);
	}
};


app.use(express.static(path.join(__dirname, 'build')));
app.post('/register', async (req, res) => {
	const { email, name, password, age } = req.body;
	try {
		if(User.findAll({where:{
			name: name,
		}})){
			console.error('User with name: ' + name + ' already exists.');
			res.status(500).json({ error: 'Error during registration' });
		}
		if(User.findAll({where:{
			email: email,
		}})){
			console.error('User with email: ' + email + ' already exists.');
			res.status(500).json({ error: 'Error during registration' });
		}else{
			const user = await User.create({ email, name, password, age });
			const basicDriveTypes = ['Fuel efficient', 'Fast', 'Short'];
			basicDriveTypes.map((typeLabel) =>
			Type.create({
				label: typeLabel,
				userID: user.id,
			})
		);
		res.status(201).json({ user });
		}	
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Error during registration' });
	}
});
  
app.post('/login', async (req, res) => {
	const { name, password } = req.body;
	try {
		const user = await User.findOne({ where: { name, password } });
		if (user) {
			res.status(200).json({ token: user.token, userID:user.id });
		} else {
			res.status(401).json({ error: 'Invalid credentials' });
		}
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Error during login' });
	}
});

//e2e test vlozenie
//toto vlozenie prebehne aj na zaciatku pri spusteni
app.post('/run-tests', async (req, res) => {
	try {
	  const newContainer = await docker.createContainer({
		name: 'test-container',
		Image: 'test', 
		AttachStdout: true,
		AttachStderr: true,
		Cmd: ['npm', 'test'],
		HostConfig: {
		  //NetworkMode: 'host',
		  DependsOn: ['web'],
		  AutoRemove: true,
		},
	  });

	  const data = await newContainer.start();

	  const stream = await newContainer.attach({ stream: true, stdout: true, stderr: true });
	  await new Promise((resolve, reject) => {
		stream.on('end', resolve);
		stream.on('error', reject);
	  });

	  const inspectData = await newContainer.inspect();
	  const exitCode = inspectData.State.ExitCode;

	  await newContainer.stop();
	  await newContainer.remove();

	  if (exitCode === 0) {
		res.status(200).json({ success: true });
	  } else {
		res.status(500).json({ error: 'Tests failed' });
	  }
	} catch (error) {
	  console.error('Error running tests:', error);
	  res.status(500).json({ error: 'Internal server error' });
	}
  });

app.get('/users/:userID', async (req, res) => {
  try {
		const userID = req.params.userID;
		const user = await User.findByPk(userID);

		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}
		const userData = {
			id: user.id,
			name: user.name,
		};

		res.json(userData);
	} catch (error) {
		console.error('Error fetching user:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});
  
app.get('/getusers', async (req, res) => {
	try {
	const users = await User.findAll({
		where: {
		name: {
			[Sequelize.Op.not]: 'admin'
		}
		}
	});
	const usersDetails = await Promise.all(
		users.map(async (user) => {
		const types = await Type.findAll({ where: { userID: user.id } });
		const driveCount = await Drive.count({ where: { userID: user.id } });

		return {
			id: user.id,
			name: user.name,
			email: user.email,
			password: user.password,
			age: user.age,
			types,
			driveCount,
		};
		})
	);

	res.json({ users: usersDetails });
	} catch (error) {
	console.error('Error fetching users:', error);
	res.status(500).json({ error: 'Internal server error' });
	}
});

app.post('/users/add', async (req, res) => {
	const { email, name, password, age } = req.body;

	try {
	const newUser = await User.create({ email, name, password, age });
	res.status(201).json({ user: newUser });
	} catch (error) {
	console.error(error);
	res.status(500).json({ error: 'Error adding user' });
	}
});

app.delete('/users/delete/:id', async (req, res) => {
	const userToDelete = parseInt(req.params.id);
	try {
	await User.destroy({ where: { id: userToDelete } });
	res.status(204).send();
	} catch (error) {
	console.error(error);
	res.status(500).json({ error: 'Error deleting user' });
	}
});

app.post('/drives/add', async (req, res) => {
	const { distance, duration, fuelConsumption, creationDate, userID, typeID } = req.body;
	try {
		const newDrive = await Drive.create({
			distance,
			duration,
			fuelConsumption,
			creationDate,
			userID,
			typeID,
		});

		res.json({ drive: newDrive });
	} catch (error) {
		console.error('Error adding drive:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

app.get('/drives/:userID', async (req, res) => {
	const userID = req.params.userID;
	try {
		const drives = await Drive.findAll({
		where: {
			userID: userID,
		},
		});

		res.json({ drives });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Error fetching drives' });
	}
});

app.delete('/drives/delete/:id', async (req, res) => {
	const { id } = req.params;
	try {
		await Drive.destroy({ where: { id } });
		res.status(204).send();
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Error deleting drive' });
	}
});

app.get('/types/:userID', async (req, res) => {
	try {
		const userID = req.params.userID;
		const types = await Type.findAll({
			where: {
				userID: userID,
			},
		});
		res.json({ types });
	} catch (error) {
		console.error('Error fetching types:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

app.post('/types/add', async (req, res) => {
	try {
		const { label, userID } = req.body;
		const newType = await Type.create({ label, userID });
		res.json({ type: newType });
	} catch (error) {
		console.error('Error adding type:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

app.delete('/types/delete/:typeID', async (req, res) => {
	try {
		const typeID = req.params.typeID;
		await Type.destroy({ where: { typeID: typeID } });
		res.json({ success: true });
	} catch (error) {
		console.error('Error deleting type:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

app.post('/addOrUpdateAd', async (req, res) => {
	try {
	  const { imgLink, adLink } = req.body;
	  const existingAd = await Ad.findOne();
  
	  if (existingAd) {
		await existingAd.update({
		  imgLink,
		  adLink,
		});
	  } else {
		await Ad.create({
		  imgLink,
		  adLink,
		});
	  }
  
	  res.json({ success: true });
	} catch (error) {
	  console.error('Error adding/updating ad:', error);
	  res.status(500).json({ error: 'Internal server error' });
	}
});

app.get('*', (req, res) => {
  	res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => {
  	console.log(`Server is running on port ${port}`);
	seedDatabase();
	/*adlink = 'https://www.fiit.stuba.sk/';
	imglink = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/FIIT_STU_01.jpg/1024px-FIIT_STU_01.jpg';
	Ad.create({imglink,adlink});*/
});
