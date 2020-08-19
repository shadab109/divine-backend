const functions = require('firebase-functions');
const firebase = require('firebase');
const admin = require('firebase-admin');
const app = require('express')();



admin.initializeApp();

const db = admin.firestore();

const firebaseConfig = {
    apiKey: "AIzaSyDI-JXhYymFhAigOaGX-AX2DRNca0IsYMk",
    authDomain: "divine-app-41171.firebaseapp.com",
    databaseURL: "https://divine-app-41171.firebaseio.com",
    projectId: "divine-app-41171",
    storageBucket: "divine-app-41171.appspot.com",
    messagingSenderId: "488140413462",
    appId: "1:488140413462:web:e8e40721a7d45168d4f337",
    measurementId: "G-GG5FFEYGMV"
  };

 
  firebase.initializeApp(firebaseConfig);

// Get all posts
app.get('/getItems',(req,res) =>{
    db
    .collection('posts')
    .orderBy('createdAt','desc')
    .get()
    .then((data) => {
        let posts = [];
        data.forEach((doc) =>{
            posts.push({
                postId:doc.id,
                To:doc.data().To,
                postText:doc.data().postText,
                postFile:doc.data().postFile,
                createdAt:doc.data().createdAt
            });
        })
        return res.json(posts);
    })
    .catch((err) =>{
        console.error(err)
    })
})

// Create Post.
app.post('/post',(req,res) => {
    const post = {
        To:req.body.to,
        createdAt:new Date().toISOString(),
        postText:req.body.posttext,
        postFile:req.body.postfile,
    };
    db
        .collection('posts')
        .add(post)
        .then((doc) =>{
            return res.json({message:`Document ${doc.id}created successfully.`})
        })
        .catch(err =>{
            return res.status(500).json({message:'something went wrong !'})
        })
})

// User Signup
app.post('/signup',(req,res) => {
    const newUser = {
        email:req.body.email,
        password:req.body.password,
        confirmPassword:req.body.confirmPassword,
        name:req.body.name
    };

    // Validation
    let userId,token;
    db.doc(`/users/${newUser.name}`).get()
    .then(doc => {
        if(doc.exists){
            return res.status(400).json({name:'This name is already  taken'})
        }
        else if(newUser.password != newUser.confirmPassword){
            return res.status(400).json({confirm:'Password should be same'})
        }
        else{
            return firebase.auth()
            .createUserWithEmailAndPassword(newUser.email,newUser.password)
        }
    })
    .then(data =>{
        userId = data.user.uid;
        return data.user.getIdToken();
    })
    .then(idToken =>{
        token = idToken;
        const userDoc = {
            name:newUser.name,
            email:newUser.email,
            joinedAt:new Date().toISOString(),
            password: newUser.password,
            userId

        };
        return db.doc(`/users/${newUser.name}`).set(userDoc);
    })
    .then(()=>{
        return res.status(201).json({token});
    })
    .catch(err =>{
        return res.status(500).json({err})
    })
})


// Login Route.
app.post('/login',(req,res) => {
    const loginWith = {
        user:req.body.user,
        password:req.body.password
    }

    // firebase
    //     .auth()
    //     .signInWithEmailAndPassword(loginWith.email,loginWith.password)
    //     .then(data =>{
    //         return data.user.getIdToken();
    //     })
    //     .then(token =>{
    //         return res.status(201).json({token});
    //     })
    //     .catch(err =>{
    //         return res.status(500).json({error:err.code});
    //     })

    var docRef = db.collection("users").doc(loginWith.user);

    docRef.get().then(function(doc) {
        if (doc.exists) {
            console.log("Document data:", doc.data());
            if(doc.data().name == loginWith.user && doc.data().password == loginWith.password){
                return res.status(201).json({message:"Login Successful"});
            }
        } else {
            // doc.data() will be undefined in this case
            return res.status(403).json({error:"Wrong Credentials"});
        }
    }).catch(function(error) {
        return res.status(500).json({error:error});
    });

})

    
// Get user specific posts

app.post('/taggedPost',(req,res) =>{

    //const userPosts = {user:req.body.user};

    db.collection('posts')
    .where('To', '==', req.body.user).get()
    .then(data =>{
        let posts = [];
        data.forEach(doc => {
            posts.push({
                postId:doc.id,
                postText:doc.data().postText,
                postFile:doc.data().postFile,
                createdAt:doc.data().createdAt
            });

            });
            return res.json(posts);
    })

})


// Image upload
app.post('/postImage',(req,res) =>{

    const Busboy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    let imageToBeUploaded = {};
    let imageFileName;
 
    const busboy = new Busboy({headers:req.headers});

    busboy.on('file', (fieldname,file,filename,encoding,mimetype) => {

        if(mimetype !== 'image/jpeg' & mimetype !== 'image/png'){
            return res.status(400).json({error:"Wrong file type submitted!o"})
        }

        // Image extension
        const imageExtension = filename.split('.')[filename.split('.').length -1];

        // 84575984739.png(image name)
        imageFileName = `${Math.round(Math.random()*1000000000000)}.${imageExtension}`;

        const filepath = path.join(os.tmpdir(),imageFileName);
        imageToBeUploaded = { filepath, mimetype };
        file.pipe(fs.createWriteStream(filepath));
    });

    busboy.on('finish', () => {
        admin.storage().bucket(`${firebaseConfig.storageBucket}`).upload(imageToBeUploaded.filepath, {
            resumable:false,
            metadata:{
                metadata: {
                    contentType:imageToBeUploaded.mimetype
                }
            }
        })
        .then(() =>{
            const imgUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageFileName}?alt=media`;
            return res.json(imgUrl)
        })
        .catch(err =>{
            console.error(err);
            return res.status(500).json({error:err.code})
        })
    })
    busboy.end(req.rawBody);
});


// Get all posts
app.get('/getUsers',(req,res) =>{
    db
    .collection('users')
    .get()
    .then((data) => {
        let users = [];
        data.forEach((doc) =>{
            users.push({
               
                user:doc.data().name,
            });
        })
        return res.json(users);
    })
    .catch((err) =>{
        console.error(err)
    })
})

// Base url
exports.api = functions.https.onRequest(app);


