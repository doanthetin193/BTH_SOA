import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        username: {
            type: String,
            required: true
        },
        products: [
            {
                productId: {
                    type: String,
                    required: true
                },
                name: {
                    type: String,
                    required: true
                },
                price: {
                    type: Number,
                    required: true
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 1
                }
            }
        ],
        totalAmount: {
            type: Number,
            required: true,
            default: 0
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'cancelled'],
            default: 'pending'
        }
    },
    { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
