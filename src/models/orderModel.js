const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;

const orderSchema = new mongoose.Schema(
    {
        userId: {
            type: ObjectId,
            ref: "User",
            required: true,
        },
        items: [
            {
                _id: false,
                productId: {
                    type: ObjectId,
                    ref: "product",
                    required: true,
                },
                quantity: {
                    type: Number,
                    default: 1,
                },
            },
        ],
        totalPrice: {
            type: Number,
            required: true,
        },
        totalItems: {
            type: Number,
            required: true,
        },
        totalQuantity: {
            type: Number,
            reuired: true,
        },
        cancellable: {
            type: Boolean,
            default: true,
        },
        status: {
            type: String,
            default: "pending",
            enum: ["pending", "completed", "cancelled"],
            trim: true,
        },
        deletedAt: {
            type: Date
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);


