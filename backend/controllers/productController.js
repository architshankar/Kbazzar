const mongoose = require('mongoose');


// Define the Notification Schema
const notificationSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',  // Reference to the User model
        required: true 
    },
    message: { 
        type: String, 
        required: true 
    },
    read: { 
        type: Boolean, 
        default: false 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Create the Notification Model
const Notification = mongoose.model('Notification', notificationSchema);

// let schema = new mongoose.Schema({
//     pname: String,
//     pdesc: String,
//     price: String,
//     catagory: String,
//     pimage: String,
//     pimage2: String,
//     addedBy: mongoose.Schema.Types.ObjectId, // which user has added the product
//     pLoc: {
//         type: {
//             type: String,
//             enum: ['Point'],
//             default: 'Point'
//         },
//         coordinates: {
//             type: [Number]
//         }
//     },
//     hostel: {
//         type: {
//             name: {
//                 type: String,
//                 enum: ['KP', 'QC', 'Other'], // Restrict values to KP, QC, or Other
//                 required: true,
//             },
//             number: {
//                 type: String,
//                 required: function () {
//                     return this.hostel.name !== 'Other'; // Number is required only for KP and QC
//                 },
//             },
//         },
//         required: true, // Hostel field is required
//     },

// })

let schema = new mongoose.Schema({
    pname: String,
    pdesc: String,
    price: String,
    catagory: String,
    pimage: String,
    pimage2: String,
    addedBy: mongoose.Schema.Types.ObjectId, // which user has added the product
    pLoc: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number],
        },
    },
    hostel: {
        name: {
            type: String,
            enum: ['KP', 'QC', 'Other'], // Restrict values to KP, QC, or Other
            required: true, // Hostel name is mandatory
        },
        number: {
            type: String,
            required: function () {
                return this.hostel.name !== 'Other'; // Number is required only for KP and QC
            },
        },
    },
    isApproved: { type: Boolean, default: false }, // Approval status
    createdAt: { type: Date, default: Date.now },  // Add creation date
});

schema.index({ pLoc: '2dsphere' })

//creating the mongoose model , kinda like a template 

const Products = mongoose.model('Products', schema)






module.exports.search = (req, res) => {
    

    // Extract search query parameter
    let search = req.query.search;

    // Construct the MongoDB query
    let query = {
        $or: [
            { pname: { $regex: search, $options: 'i' } },  // Case-insensitive regex search for pname
            { pdesc: { $regex: search, $options: 'i' } },  // Case-insensitive regex search for pdesc
            { price: { $regex: search, $options: 'i' } },  // Case-insensitive regex search for price
        ]
    };

    // If location is provided, add it to the query
    if (req.query.loc) {
        let latitude = req.query.loc.split(',')[0];
        let longitude = req.query.loc.split(',')[1];

        query.pLoc = {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [parseFloat(latitude), parseFloat(longitude)]
                },
                $maxDistance: 100000,
            }
        };
    }

    // Perform the search query
    Products.find(query)
        .then((results) => {
            res.send({ message: 'successfully-fetched', products: results });
        })
        .catch((err) => {
            res.send({ message: 'server err now' });
        });
}


module.exports.addProduct = (req, res) => {
    

    // Extract geolocation coordinates
    const plat = parseFloat(req.body.plat);
    const plong = parseFloat(req.body.plong);
    if (isNaN(plat) || isNaN(plong)) {
        return res.status(400).send('Invalid geolocation coordinates');
    }

    // Extract product details
    const pname = req.body.pname;
    const pdesc = req.body.pdesc;
    const price = req.body.price;
    const catagory = req.body.catagory;

    // Handle file uploads (optional images)
    let pimage = null;
    let pimage2 = null;

    if (req.files && req.files.pimage && req.files.pimage[0]) {
        pimage = req.files.pimage[0].path;
    }
    if (req.files && req.files.pimage2 && req.files.pimage2[0]) {
        pimage2 = req.files.pimage2[0].path;
    }

    // Validation: Ensure at least one image is provided
    if (!pimage && !pimage2) {
        return res.status(400).send('At least one product image must be uploaded');
    }

    // If only `pimage2` is uploaded, make it the primary image
    if (!pimage && pimage2) {
        pimage = pimage2;
        pimage2 = null; // Remove secondary image reference
    }

    const addedBy = req.body.userId;

    // Extract hostel details
    const hostelName = req.body.hostel; // Correct field name
    const hostelNumber = req.body.hostelNumber;

    // Validate hostel details
    if (!hostelName || (hostelName !== 'Other' && !hostelNumber)) {
        return res.status(400).send('Invalid hostel details');
    }

    const hostel = { name: hostelName };
    if (hostelName !== 'Other') {
        hostel.number = hostelNumber;
    }

    // Create product object
    const product = new Products({
        pname,
        pdesc,
        price,
        catagory,
        pimage,
        pimage2,
        addedBy,
        pLoc: { type: 'Point', coordinates: [plat, plong] },
        hostel,
    });

    // Save product to database
    product
        .save()
        .then(() => {
            res.send('Product Added');
        })
        .catch((err) => {
            console.error(err);
            res.status(500).send('Error at server side');
        });
};


module.exports.getProduct = (req, res) => {
    const catName = req.query.catName;
    const query = catName ? { catagory: catName } : {}; // Fetch all if no catName


    Products.find(query)
        .then((result) => {
            res.send({ message: 'success', product: result })
        })
        .catch((err) => {
            res.send({ message: 'server couldent fetch products ' })
        })
}

module.exports.getProductsbyId = (req, res) => {

    

    Products.findOne({ _id: req.params.pId })
        .then((result) => {
            res.send({ message: 'success', product: result })
        })
        .catch((err) => {
            res.send({ message: 'server couldent fetch product' })
        })
}


module.exports.myProducts = (req, res) => {

    const userId = req.body.userId;

    Products.find({ addedBy: userId })  // if the added product (addedby) id is same as user id (userId) it belongs to my products 
        .then((result) => {
            res.send({ message: 'success', products: result })
        })
        .catch((err) => {
            res.send({ message: 'server couldent fetch products here' })
        })
}

module.exports.adminPanel = async (req, res) => {
    try {
        const products = await Products.find()
            .populate('addedBy', 'username email') // Fetch user details (username, email)
            .sort({ createdAt: -1 }); // Sort by newest first

        res.status(200).json({ message: 'success', products });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
};

module.exports.approveProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Products.findByIdAndUpdate(
            productId,
            { isApproved: true },
            { new: true } // Return the updated product
        );

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json({ message: 'Product approved', product });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to approve product' });
    }
};

module.exports.rejectProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Products.findByIdAndDelete(productId);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json({ message: 'Product rejected and deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reject product' });
    }
};

module.exports.getApprovedProducts = async (req, res) => {
    try {
        const products = await Products.find({ isApproved: true });
        res.status(200).json({ message: 'success', products });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch approved products' });
    }
};


module.exports.deleteProduct = async (req, res) => {
    try {
        const productId = req.params.productId; // Product ID from URL
        const userId = req.body.userId;  // User ID from request body

        // Validate productId and userId to ensure they are valid ObjectIds
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'Invalid product ID' });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }

        // Find the product by ID
        const product = await Products.findById(productId);

        // If product not found
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Ensure the user is the one who added the product
        if (!product.addedBy.equals(new mongoose.Types.ObjectId(userId))) {
            return res.status(403).json({ message: 'You can only delete your own products' });
        }

        // Delete the product
        await Products.findByIdAndDelete(productId);

        // Send a success response
        res.status(200).json({ message: 'Product deleted successfully' });

    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ error: 'Failed to delete product' });
    }
};

module.exports.deleteProductByAdmin = async (req, res) => {
    try {
        const productId = req.params.id; // Extract product ID from URL

        // Validate productId to ensure it's a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'Invalid product ID' });
        }

        // Find the product by ID
        const product = await Products.findById(productId);

        // If product not found
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Delete the product
        await Products.findByIdAndDelete(productId);

        // Send success response
        res.status(200).json({ message: 'Product deleted successfully by admin' });
    } catch (err) {
        console.error('Error deleting product by admin:', err);
        res.status(500).json({ error: 'Failed to delete product' });
    }
};




// Fetch notifications for a user
module.exports.getNotifications = (req, res) => {
    Notification.find({ userId: req.params.userId })
        .then((notifications) => res.json({ notifications }))
        .catch((err) => res.status(500).send('Error fetching notifications'));
};

// Mark notifications as read
module.exports.markNotificationsRead = (req, res) => {
    const { userId } = req.body;

    Notification.updateMany({ userId, read: false }, { $set: { read: true } })
        .then(() => res.status(200).send('Notifications marked as read'))
        .catch((err) => res.status(500).send('Error marking notifications as read'));
};


// module.exports.sendRejectionNotification = async (req, res) => {
//     const { userId, message } = req.body;

//     if (!userId || !message) {
//         return res.status(400).json({ message: 'User ID and message are required' });
//     }

//     try {
//         const notification = new Notification({
//             userId,
//             message,
//         });

//         await notification.save(); // Save the notification in the database
//         res.status(201).json({ message: 'Notification sent successfully' });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Failed to send notification' });
//     }
// };

module.exports.sendRejectionNotification = async (req, res) => {
    const { userId, message, productName } = req.body;

    if (!userId || !message || !productName) {
        return res.status(400).json({ message: 'User ID, product name, and message are required' });
    }

    try {
        const notification = new Notification({
            userId,
            message: `${message} for product: ${productName}`, // Include product name in message
            productName, // Store product name separately if needed
            read: false, // Set as unread by default
        });

        await notification.save(); // Save the notification in the database
        res.status(201).json({ message: 'Notification sent successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to send notification' });
    }
};




//     try {
//         const productId = req.params.productId; // Get the product ID from the URL parameters
//         const userId = req.body.userId;  // Assuming the user ID is sent in the request body to ensure ownership

//         // Find the product by ID and check if the user is the one who uploaded it
//         const product = await Products.findById(productId);
        
//         if (!product) {
//             return res.status(404).json({ message: 'Product not found' });
//         }

//         if (product.userId.toString() !== userId) {
//             return res.status(403).json({ message: 'You can only delete your own products' });
//         }

//         // Delete the product
//         await Products.findByIdAndDelete(productId);

//         // Send a success response
//         res.status(200).json({ message: 'Product deleted successfully' });

//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: 'Failed to delete product' });
//     }
// };