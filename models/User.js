const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');

const UserSchema = new Schema({
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true },

  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
}
});



UserSchema.pre('save', async function (next) {
    const user = this;
    if (!user.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(user.password, salt);
    user.password = hash;
    next();
  });

module.exports=mongoose.model('users',UserSchema)