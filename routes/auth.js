const { Router } = require("express");
require("dotenv").config();

const router = Router();
const path = './users.json'
const jf = require('jsonfile');

const User = jf.readFileSync(path);

// signup
router.post("/signUp", async (req, res) => {
    try {
        
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: true, message: "Internal Server Error" });
    }
});

// login
router.post("/logIn", async (req, res) => {
    try {
        
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: true, message: "Internal Server Error" });
    }
});

module.exports = router;