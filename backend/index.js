

const express = require('express');
const app = express();
const port = 4000;
const path = require('path'); // path to set images to frontend
const cors = require('cors');
const jwt = require('jsonwebtoken');
// const bodyParser = require('body-parser')

const productController = require('./controllers/productController'); // Correct naming
const userController = require('./controllers/userController');

const multer = require('multer');

// Multer setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads'); // used to locate the folder
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix);
    }
});

const upload = multer({ storage: storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // to show frontend the images

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Mongoose connection
const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://archit_shankar:06keoaEVd8ofe0pB@cluster0.rgtxbqt.mongodb.net/Kbazzar'); // connecting to mongoose

// Routes
app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/search', productController.search);

app.post('/like-product', userController.likeProducts);

app.post('/add-product', upload.fields([{ name: 'pimage' }, { name: 'pimage2' }]), productController.addProduct);

app.get('/get-products', productController.getProduct);

app.get('/get-product/:pId', productController.getProductsbyId);

app.post('/liked-products', userController.likedProducts);

app.post('/my-products', productController.myProducts);

app.post('/signup', userController.signup);

app.get('/my-profile/:userId', userController.myProfileById);

app.get('/get-user/:uId', userController.getUserById);

app.post('/login', userController.login);

// Admin panel routes
app.get('/admin/products', productController.adminPanel);


app.put('/admin/products/:id/approve', productController.approveProduct);

app.delete('/admin/products/:id/reject', productController.rejectProduct);

app.get('/products', productController.getApprovedProducts);

app.delete('/delete-product/:productId' , productController.deleteProduct)

app.delete('/admin/products/:id/delete', productController.deleteProductByAdmin)


// Fetch Notifications for a User..
app.get('/notifications/:userId', productController.getNotifications);

// Mark Notifications as Read
app.post('/notifications/read', productController.markNotificationsRead);

app.post('/notifications/reject', productController.sendRejectionNotification);

app.post('/send-otp', userController.sendOTP);

app.post('/verify-otp', userController.verifyOTP);


// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
