const mongoose = require('mongoose');
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const redis = require('redis');



// Email transporter configuration
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'aashankar637@gmail.com',
        pass: 'kqtc esut npcn vsev',
    },
});


const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,  // Ensures uniqueness of email
    },
    otp: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600, // Document will expire after 600 seconds (10 minutes)
    },
});

otpSchema.index({ email: 1 }, { unique: true }); // Ensure unique index on email field

const OTP = mongoose.model('OTP', otpSchema);





const Users = mongoose.model('Users', {
    Username: { 
        type: String, 
        required: [true, 'Username is required'], 
        trim: true 
    },
    password: { 
        type: String, 
        required: [true, 'Password is required'] 
    },
    email: { 
        type: String, 
        required: [true, 'Email is required'], 
        unique: true, 
        match: [
            /^[a-zA-Z0-9._%+-]+@(kiit\.ac\.in|kims\.ac\.in)$/,
            'Please enter a valid college email address (e.g., @kiit.ac.in or @kims.ac.in)'
        ] 
    },
    mobile: { 
        type: String, 
        required: [true, 'Mobile number is required'], 
        unique: true, 
        validate: {
            validator: function(v) {
                return /^\d{10}$/.test(v); // Ensures exactly 10 digits
            },
            message: 'Please enter a valid 10-digit mobile number'
        }
    },
    likedProducts: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Products' 
    }]
});



module.exports.likeProducts = (req, res) => {
    let productId = req.body.productId;
    let userId = req.body.userId;

    console.log(req.body);


    Users.updateOne({ _id: userId } // finds user by their id 
        , { $addToSet: { likedProducts: productId } }) //add productId to the liked prod. id
        .then(() => {
            res.send('Liked-successfully')
        })
        .catch(() => {
            res.send('Error-could-not-like')
        });
}



module.exports.signup = async (req, res) => {
    const username = req.body.username; // Getting the data from frontend
    const password = req.body.password; // Getting the data from frontend
    const email = req.body.email;      // Getting the data from frontend
    const mobile = req.body.mobile;

    try {
        // Hash the password with bcrypt
        const saltRounds = 10; // You can change this value for more security, but 10 is standard
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create a new user entry with the hashed password
        const user = new Users({ 
            Username: username, 
            password: hashedPassword, 
            email, 
            mobile 
        });

        // Save the user in the database
        await user.save();

        res.send('User created successfully');
    } catch (error) {
        console.error('Error at server side:', error);
        res.status(500).send('Error at server side');
    }
};



module.exports.myProfileById = (req,res)=>{
    let uid = req.params.userId ;
    

    Users.findOne({_id : uid })
    .then((result)=>{
        res.send({
            message : 'success', user : {
                email : result.email , 
                mobile: result.mobile , 
                Username : result.Username 
            }
        })
    })
    .catch((err)=>{
        res.send({message : 'server couldent fetch user data'})
    })
}

module.exports.getUserById = (req,res)=>{   // show contact ?
    const _userId = req.params.uId ;

    Users.findOne({ _id: _userId })
    .then((result) => {
        res.send({ message : 'success alksdfjalsk' , 
            user : {email : result.email ,
                mobile : result.mobile ,
                Username : result.Username } })
    })
    .catch(() => {
        res.send('Error at server side ')
    });
}

// module.exports.login = (req, res) => {

//     const username = req.body.username;  //getting the data from fontend
//     const password = req.body.password;  //getting the datat from frontend

//     //first username for model second username for data of frontend

//     Users.findOne({ Username: username })
//         .then((result) => {

//             if (!result) {
//                 return res.status(404).json({ message: 'User not found' });
//             }
//             else {
//                 if (result.password == password) {
//                     const token = jwt.sign({
//                         data: result
//                     }, 'MYKEY', { expiresIn: '1h' });
//                     return res.status(200).json({
//                         message: 'Login successful',
//                         token: token,
//                         userId: result._id
//                     });
//                 }
//                 else {
//                     return res.status(401).json({ message: 'Incorrect password' });
//                 }
//             }
//         })
//         .catch(() => {
//             res.send({ message: 'failed' })
//         });


// }



module.exports.login = (req, res) => {
    const username = req.body.username;  // Getting the data from frontend
    const password = req.body.password;  // Getting the data from frontend

    Users.findOne({ Username: username })
        .then(async (result) => {
            if (!result) {
                return res.status(404).json({ message: 'User not found' });
            } else {
                // Compare the plain text password with the hashed password
                const isMatch = await bcrypt.compare(password, result.password);
                if (isMatch) {
                    // Generate a JWT token if the password is correct
                    const token = jwt.sign(
                        { data: result },
                        'MYKEY',
                        { expiresIn: '1h' }
                    );
                    return res.status(200).json({
                        message: 'Login successful',
                        token: token,
                        userId: result._id
                    });
                } else {
                    return res.status(401).json({ message: 'Incorrect password' });
                }
            }
        })
        .catch((err) => {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        });
};



module.exports.likedProducts = (req, res) => {


    Users.findOne({ _id: req.body.userId }).populate('likedProducts')
        .then((result) => {
            res.send({ message: 'success', products: result.likedProducts })
        })
        .catch((err) => {
            res.send({ message: 'server couldent fetch products here' })
        })
}


// Endpoint to send OTP
// module.exports.sendOTP = (req, res) => {
//     const { email } = req.body;
//     const otp = crypto.randomInt(1000, 9999).toString();  // Generate a 4-digit OTP
//     otpStore[email] = otp;  // Store OTP temporarily in memory

//     // Define mailOptions after OTP is generated
//     const mailOptions = {
//         from: 'aashankar637@gmail.com',  // Replace with your actual email
//         to: email,
//         subject: 'Your OTP for Email Verification',
//         text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
//     };

//     // Send OTP via email using the transporter
//     transporter.sendMail(mailOptions, (error) => {
//         if (error) {
//             console.error('Error sending OTP:', error); // Log the actual error for debugging
//             return res.status(500).json({ error: 'Failed to send OTP' });
//         }
//         res.status(200).json({ message: 'OTP sent successfully' });
//     });
// };

// module.exports.sendOTP = async (req, res) => {
//     const { email } = req.body;
//     const otp = crypto.randomInt(1000, 9999).toString();  // Generate a 4-digit OTP

//     try {
//         // Create a new OTP document and store it in MongoDB
//         const otpEntry = new OTP({
//             email,
//             otp,
//         });

//         await otpEntry.save();  // Save OTP to MongoDB

//         // Send OTP via email
//         const mailOptions = {
//             from: 'aashankar637@gmail.com',  // Replace with your actual email
//             to: email,
//             subject: 'Your OTP for Email Verification',
//             text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
//         };

//         transporter.sendMail(mailOptions, (error) => {
//             if (error) {
//                 console.error('Error sending OTP:', error);
//                 return res.status(500).json({ error: 'Failed to send OTP' });
//             }
//             res.status(200).json({ message: 'OTP sent successfully' });
//         });

//     } catch (error) {
//         console.error('Error storing OTP:', error);
//         res.status(500).json({ error: 'Failed to store OTP' });
//     }
// };

module.exports.sendOTP = async (req, res) => {
    const { email } = req.body;
    const otp = crypto.randomInt(1000, 9999).toString();  // Generate a 4-digit OTP

    try {
        // Try to find an existing OTP for the email
        let otpEntry = await OTP.findOne({ email });

        if (otpEntry) {
            // If OTP exists, update it
            otpEntry.otp = otp;
            otpEntry.createdAt = Date.now();  // Update the creation time to reset the TTL
            await otpEntry.save();  // Save the updated OTP
        } else {
            // If no OTP exists, create a new OTP entry
            otpEntry = new OTP({
                email,
                otp,
            });
            await otpEntry.save();  // Save the new OTP entry
        }

        // Send OTP via email
        const mailOptions = {
            from: 'your_email@gmail.com',  // Replace with your actual email
            to: email,
            subject: 'Your OTP for Email Verification',
            text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
        };

        transporter.sendMail(mailOptions, (error) => {
            if (error) {
                console.error('Error sending OTP:', error);
                return res.status(500).json({ error: 'Failed to send OTP' });
            }
            res.status(200).json({ message: 'OTP sent successfully' });
        });

    } catch (error) {
        console.error('Error storing OTP:', error);
        res.status(500).json({ error: 'Failed to store OTP' });
    }
};


// Endpoint to verify OTP
// module.exports.verifyOTP = (req, res) => {
//     const { email, otp } = req.body;

//     if (otpStore[email] === otp) {
//         delete otpStore[email];
//         return res.status(200).json({ message: 'Email verified successfully' });
//     }

//     res.status(400).json({ error: 'Invalid OTP' });
// }

module.exports.verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    try {
        const otpEntry = await OTP.findOne({ email });

        if (!otpEntry) {
            return res.status(400).json({ error: 'OTP not found' });
        }

        if (otpEntry.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        // OTP is correct and valid
        res.status(200).json({ message: 'OTP verified successfully' });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
};




