import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Order',
            index: true
        },
        productId: {
            type: String,
            required: true
        },
        productName: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        unitPrice: {
            type: Number,
            required: true
        },
        totalPrice: {
            type: Number,
            required: true
        }
    },
    { timestamps: true }
);

// Tính toán totalPrice trước khi save
orderItemSchema.pre('save', function(next) {
    this.totalPrice = this.quantity * this.unitPrice;
    next();
});

const OrderItem = mongoose.model("OrderItem", orderItemSchema);

export default OrderItem;
