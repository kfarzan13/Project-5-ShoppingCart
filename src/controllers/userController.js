const userModel = require('../models/userModel')
const jwt = require("jsonwebtoken")
const config = require("../utils/awsConfig")
const bcrypt = require('bcrypt')
const validator = require("../utils/validator")
const mongoose = require("mongoose")
const { isValidObjectId } = mongoose

const { isEmpty, isValidName, isValidEmail, isValidPhone, isValidBody, isValidpincode, isVaildPass, isVaildfile } = validator


const userCreate = async function (req, res) {
    try {

        let files = req.files;

        let data = req.body

        let { fname, lname, email, phone, password, address } = data

        address = JSON.parse(address)

        if (!fname) return res.status(400).send({ status: false, message: "fname is requires" })
        if (!isValidName(fname.trim())) return res.status(400).send({ status: false, message: `${fname} is not a valide first name.` })


        if (!lname) return res.status(400).send({ status: false, message: "lname is requires" })
        if (!isValidName(lname.trim())) return res.status(400).send({ status: false, message: `${lname} is not a valide last name.` })


        if (!email) return res.status(400).send({ status: false, message: "email is requires" })
        if (!isValidEmail(email.trim())) return res.status(400).send({ status: false, message: `${email} is not a valide email.` })
        const isEmailAlreadyUsed = await userModel.findOne({ email })
        if (isEmailAlreadyUsed) { return res.status(409).send({ status: false, message: `${email} is already in use, Please try a new email.` }) }
        // if resource is already presend in DB then we use 409 status code

        if (!phone) return res.status(400).send({ status: false, message: "phone is required" })
        if (!isValidPhone(phone)) return res.status(400).send({ status: false, message: `${phone} is not a valide phone.` })
        const isPhoneAlreadyUsed = await userModel.findOne({ phone })
        if (isPhoneAlreadyUsed) { return res.status(409).send({ status: false, message: `${phone} is already in use, Please try a new phone number.` }) }


        if (!password) return res.status(400).send({ status: false, message: "password is required" })
        if (!isVaildPass(password.trim())) return res.status(400).send({ status: false, message: "Please provide a valid Password with min 8 to 15 char with Capatial & special (@#$%^!) char " })



        if (!address) return res.status(400).send({ status: false, message: "address is required" })

        if (!address.shipping) {
            return res.status(400).send({ status: false, message: "Shipping address cannot be empty." })
        }

        if (address.shipping) {

            if (!isEmpty(address.shipping.street)) return res.status(400).send({ status: false, message: "Shipping address's Street Required" })
            if (!isEmpty(address.shipping.city)) return res.status(400).send({ status: false, message: "Shipping address city Required" })
            if (!(address.shipping.pincode)) return res.status(400).send({ status: false, message: "Shipping address's pincode Required" })
            if (!isValidpincode(address.shipping.pincode)) return res.status(400).send({ status: false, message: "Shipping Pinecode is not valide" })

        }
        // Billing Address validation

        if (address.billing) {
            if (!isEmpty(address.billing.street)) return res.status(400).send({ status: false, message: "billing address's Street Required" })
            if (!isEmpty(address.billing.city)) return res.status(400).send({ status: false, message: "billing address city Required" })
            if (!(address.billing.pincode)) return res.status(400).send({ status: false, message: "billing address's pincode Required" })
            if (!isValidpincode(address.billing.pincode)) return res.status(400).send({ status: false, message: "billing Pinecode is not valide" })

        } else {
            return res.status(400).send({ status: false, message: "Billing address cannot be empty." })
        }


        if (files.length === 0) return res.status(400).send({ status: false, message: "Profile Image is mandatory" })
        if (!isVaildfile(files[0].originalname)) return res.status(400).send({ status: false, message: "profile image format is not valid plese provied jpg/png format" })
        let profileImage = await config.uploadFile(files[0]); //upload image to AWS

        const encryptedPassword = await bcrypt.hash(password, 10) //encrypting password by using bcrypt. // 10 => salt sound

        //object destructuring for response body.
        const userData = { fname, lname, email, profileImage, phone, password: encryptedPassword, address }
        const saveUserData = await userModel.create(userData);

        res.status(201).send({ status: true, message: "Success", data: saveUserData });

    } catch (error) {
        res.status(500).send({ status: false, message: error.message })
    }
}





// ---------------login----
const userLogin = async function (req, res) {
    try {
        let userdata = req.body

        if (!isValidBody(userdata)) return res.status(400).send({ status: false, message: "Please provide user cradentials !!!" })
        let { email, password } = userdata

        if (!email) return res.status(400).send({ status: false, message: "Email is required" })
        if (!isValidEmail(email.trim())) return res.status(400).send({ status: false, message: `This is not a valid email.` })

        if (!password) return res.status(400).send({ status: false, message: "Password is required" })

        let checkEmail = await userModel.findOne({ email: email });
        if (!checkEmail) return res.status(404).send({ status: false, message: "This user is not found Please provide a correct Email" });

        let checkPassword = await bcrypt.compare(password, checkEmail.password);   // mostly password used:- Abjhd@123/Pass@123
        if (!checkPassword) return res.status(400).send({ status: false, message: "Your password is wrong, Please enter correct password" });

        let userId = checkEmail._id
        let userToken = jwt.sign({ userId: userId.toString(), iat: Date.now() },
            'NAFS', { expiresIn: "24h" }
        )
        res.setHeader("x-api-key", userToken)

        res.status(200).send({ status: true, message: "Success", userId: userId, userToken })
    }
    catch (err) {
        res.status(500).send({ status: false, message: err.message });
    }
}

//-------------------get user---------------------------------

const userById = async function (req, res) {

    try {

        const userId = req.params.userId
        if (!isValidObjectId(userId)) return res.status(400).send({ status: false, message: "User id is not valid" })

        let userDetails = await userModel.findById(userId)
        if (!userDetails) return res.status(404).send({ status: false, message: "User not found" })

        return res.status(200).send({ status: true, message: "Success", data: userDetails })

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })

    }
}



const updateUser = async function (req, res) {
    try {
        let userId = req.params.userId;
        const data = req.body;
        let files = req.files;

        if (!isValidBody(data) && (typeof (files) == "undefined")) return res.status(400).send({ status: false, message: "Insert Data : BAD REQUEST" });

        let { fname, lname, email, phone, password, address } = data;

        if (address) address = JSON.parse(address)

        const dataToUpdate = {}
        if (fname) {
            if (!isValidName(fname.trim())) return res.status(400).send({ status: false, message: "First name is invalide" })
            dataToUpdate.fname = fname
        }

        if (lname) {
            if (!isValidName(lname.trim())) return res.status(400).send({ status: false, message: "Last Name is invalide" });
            dataToUpdate.lname = lname
        }

        if (email) {
            if (!isValidEmail(email.trim())) return res.status(400).send({ status: false, message: "Provide a valid email id" });
            const findEmail = await userModel.findOne({ email: email });
            if (findEmail) return res.status(409).send({ status: false, message: "email id already exist" });
            dataToUpdate.email = email
        }

        if (phone) {
            if (!isValidPhone(phone)) return res.status(400).send({ status: false, message: "Invalid phone number" });
            const checkPhone = await userModel.findOne({ phone: phone });
            if (checkPhone) return res.status(409).send({ status: false, message: "phone number already exist" });
            dataToUpdate.phone = phone
        }

        if (password) {
            if (!isVaildPass(password.trim())) return res.status(400).send({ status: false, message: "Password should be Valid min 8 character and max 15 " })
            password = await bcrypt.hash(password, 10)
            dataToUpdate.password = password
        }

        if (files.length !== 0) {
            let profileImgUrl = await config.uploadFile(files[0])
            dataToUpdate.profileImage = profileImgUrl
        }


        if (address) {
            if (!isValidBody(address)) return res.status(400).send({ status: false, message: "Insert Data in address" });
            if (!isEmpty(address.shipping)) return res.status(400).send({ status: false, message: "Please enter shipping address!" });

            if (!isEmpty(address.shipping.city) || !isValidName(address.shipping.city)) {
                return res.status(400).send({ status: false, message: "Please provide a valid city in shipping address!" });
            }
            if (!isEmpty(address.shipping.street)) return res.status(400).send({ status: false, message: "Please provide a valid street in shiping address!" });

            if (!isEmpty(address.shipping.pincode) || !isValidpincode(address.shipping.pincode)) {
                return res.status(400).send({ status: false, message: "Please provide a valid pincode in shiping address!" });
            }


            if (!isEmpty(address.billing)) return res.status(400).send({ status: false, message: "Please enter billing address!" });

            if (!isEmpty(address.billing.city) || !isValidName(address.billing.city)) {
                return res.status(400).send({ status: false, message: "Please provide a valid city in billing address!" });
            }
            if (!isEmpty(address.billing.street)) return res.status(400).send({ status: false, message: "Please provide a valid street in billing address!" });

            if (!isEmpty(address.billing.pincode) || !isValidpincode(address.billing.pincode)) {
                return res.status(400).send({ status: false, message: "Please provide a valid pincode in billing address!" });
            }
            dataToUpdate.address = address
        }

        let updateData = await userModel.findOneAndUpdate({ _id: userId },
            { $set: dataToUpdate }
            , { new: true });

        return res.status(200).send({ status: true, message: "Success", data: updateData });
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
}

module.exports = { userLogin, userById, userCreate, updateUser }
