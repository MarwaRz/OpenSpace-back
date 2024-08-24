# OpenSpace

OpenSpace is created with the intent of making it easy to reserve workstations in flexible office, which allows you more efficiently utilize resources and reducing friction experienced by users.

### Database : mongoDBCompass

### Backend :node.js express

Installing all dependencies
```bash
 npm i
 ```

### Update the environment configuration 
'.env'  contains environment-specific variables used for configuring your Node.js application. Make sure to replace the default values in the .env 
```bash
JWT_SECRET="Str0ngK3y_wevioo!2#km"
PORT = 8081
CONNECTION= 'mongodb://127.0.0.1:27017/exemple'
REACT_URL ='http://localhost:3000'

```
#### Configuring Email-Application
Configure the app within your Google Account and generate an App Password to use with your email.
```bash
PASS_EMAIL =  Generated through the configuration process
USER_EMAIL = The account from which collaboration-related emails will be sent. 

```

#### Configuring Cron

This cron job will send emails at 6:00 PM from Sunday to Thursday.
```bash
CRON_SEND_EMAILS ='00 18 *  * 0-4'
```
The cron job will clear the data reservation every day at 5:55 PM. 
```bash
CRON_CLEAR_RESERVATION ='55 17 * * *' 

```

### Admin Account 
The admin account will be created automatically.\
In the index.js file, you will find its attributes. Please make sure to set the correct information
```bash
    const email = 'exemple@gmail.com'; 
    const newUser = new User({
         firstname: 'exemplefirstname',
        lastname: 'exemplelastname',
        email: email,
        password:'exemplepassword',
        role: 'admin'
      });
```
Now you can execute the application 
```bash
node index.js
```





