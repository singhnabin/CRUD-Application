const mongoose = require('mongoose');
//creating schema

const PlaceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    details: {
        type: String,
        required: true
    },
    user: {
        type: String,
        required: true
    },
    date: {
        type: String,
        default: Date.now()
    }
})

mongoose.model('place', PlaceSchema);