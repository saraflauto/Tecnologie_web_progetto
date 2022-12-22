//Connettere al databse
var client; var root;
const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://databaseAd:mongo123@saveyourplace.8oziev0.mongodb.net/?retryWrites=true&w=majority";
client = new MongoClient(uri);

   try {
      client.connect();
      console.log("Database has Started!");  
  } catch (e) {
      console.error(e);

  }finally {
   client.close();
}

//ejs
var express = require("express"),
bodyParser = require("body-parser"), ejs = require("ejs");
const e = require('express');

var app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
//css
app.use(express.static("stili"));

//Login google
const session = require('express-session');
const passport = require('passport');
require('./auth');

//id dell'account google
var id = " ";
//nome dell'account google
var fullname = " ";
function isLoggedIn(req, res, next) {
   req.user ? next() : res.sendStatus(401);
 }
 
 app.use(session({ secret: 'cats', resave: false, saveUninitialized: true }));
 app.use(passport.initialize());
 app.use(passport.session());
 
 app.get('/', (req, res) => {
   res.render('login');
 });
 
 app.get('/auth/google',
   passport.authenticate('google', { scope: [ 'email', 'profile' ] }
 ));
 
 app.get( '/auth/google/callback',
   passport.authenticate( 'google', {
     successRedirect: '/getinfo',
     failureRedirect: '/auth/google/failure'
   })
 );
 
 app.get('/getinfo', isLoggedIn, (req, res) => {
   id = req.user.id;
   fullname = req.user.displayName;
   res.redirect('/home');
 });
 
 app.get('/logout', (req, res) => {
   req.logout();
   req.session.destroy();
   res.redirect('/');
 });
 
 app.get('/auth/google/failure', (req, res) => {
   res.send('Failed to authenticate..');
 });


//home page
app.get("/home", function (req, res) {
   
   let wel;

   if(fullname == " ")
      wel = "LOG IN TO ADD PLACES";
   else
      wel = "WELCOME " + fullname + "!";
   
   res.render("index", { 
      message: "",
      welcome: wel
   });

});

//Sottomissione del form in home page
app.post("/home", function (req, res) {
   var address = req.body.address;
   var city = req.body.city;
   let wel;
   var mess;
   console.log(address + " " + city);
   
   if(fullname != " "){
      wel = "WELCOME " + fullname + "!";
      
   //Verifichaimo se il posto inserito è già esistente
   //Dobbiamo usare find enon findOne perchè quest'ultima non funziona come dovrebbe
   client.db("save_your_place").collection("posto").find({indirizzo: address.toUpperCase(), citta: city.toUpperCase(), id: id}).toArray(function(err, result) {
      
      if (err) throw err;
      var mess="PLACE SUCCESSFULLY ADDED";

      if(result.length > 0)
         mess = "ERROR: THE PLACE ALREADY EXISTS"
      else 
         add({indirizzo: address.toUpperCase(), citta: city.toUpperCase(), completato: "no", id: id});
      
      res.render("index", { 
          message: mess,
         welcome: wel
      });
      });
      }
 
   else{
      wel = "LOG IN TO ADD PLACE";
      mess = "ERROR: YOUR ARE NOT LOGGED IN";
      res.render("index", { 
         message: mess,
         welcome: wel
      });
   }
})

//posti
app.get("/explore", function (req, res) {
   
   client.db("save_your_place").collection("posto").find({completato: "no", id: id}).sort({citta: 1, indirizzo: 1}).toArray(function(err, result) {
      if (err) throw err;
      var mess = "";
      
      if(id == " ")
      mess = "LOG IN TO SEE YOUR PLACES";
      else if(result.length== 0)
      mess = "THERE ARE NO PLACES. ADD SOME PLACES!";

      res.render("posti", { 
         listaPosti: result,
         message: mess
      });
   });
   
});

//Quando si completa un posto
app.post("/explore", function (req, res) {
   var address = req.body.address;
   var city = req.body.city;

   //Aggiorna il posto come completato
   update(address, city);

    //Ricarica la pagina
   res.redirect("/explore");
})

//posti completati
app.get("/visited", function (req, res) {
     client.db("save_your_place").collection("posto").find({completato: "yes", id: id}).sort({citta: 1, indirizzo: 1}).toArray(function(err, result) {
      if (err) throw err;

      var mess = ""; 
        
      if(id == " ")
      mess = "LOG IN TO SEE YOUR PLACES";
      else if(result.length== 0)
      mess = "THERE ARE NO PLACES. EXPLORE SOME PLACES!";

      res.render("posti_completati", { 
         listaPosti: result, 
         message: mess
      });

   });
});

app.get("/achievements", function (req, res) {
   //Conta i punti e calcola il livello
   client.db("save_your_place").collection("posto").find({completato: "yes", id: id}).toArray(function(err, result) {
      if (err) throw err;

      var numberOfPlaces = 0;
      result.forEach( element => {
         numberOfPlaces++;
      })

   //Vediamo quali obiettivi sono completati
   var points = 0;
   client.db("save_your_place").collection("obiettivo").find({}).toArray(function(err, result) {
      if (err) throw err;
      for(var i = 0; i < result.length; i++)
      {
         if(result[i].punti <= numberOfPlaces)
         {
            points+= result[i].punti;
            result.splice(i, 1);
         }
      }
      
      for(var i = 0; i < result.length; i++)
      {
         console.log(result[i].punti + " " + numberOfPlaces);
         if(result[i].punti <= numberOfPlaces)
         {
            points+= result[i].punti;
            result.splice(i, 1);
         }
      }
      
      let level;

      //In base ai punti che abbiamo, stabiliamo il livello 
      if(points == 0)
      level = 0;
      else if(points >= 5 && points<=14)
      level = 1;
      else if(points >= 15 &&  points<=24)
      level = 2;
      else if(points >= 25 && points<=39)
      level = 3;
      else if(points >= 40 && points <=59)
      level = 4;
      else if(points >= 60)
      level = 5;

      var mess = ""; 
         //se non abbiamo obiettivi allora mostriamo una stringa opportuna
         if(result.length == 0)
         mess = "ALL THE ACHIEVEMENTS ARE COMPLETED!";
   
         //renderizza sfide.ejs con il livello, i punti, il messaggio e l'array di obiettivi non completati
         res.render("sfide", { 
            obiettivi: result,
            livello:level, 
            punti: points,
            message: mess 
         });
   })
   })
});

var port = process.env.PORT || 3000;
app.listen(port, function () {
   console.log("Server Has Started!");
});


//Funzione che inserisce dati nel databse
async function add(newData){
   const result = await client.db("save_your_place").collection("posto").insertOne(newData);

   console.log("Nuovo dato aggiunto");
   
}


//Funzione che aggiorna i dati nel databse mettondo completato il posto
function update(address, city){
   const it = client.db("save_your_place").collection("posto").updateOne({indirizzo: address, citta:city, id: id}, {$set: {completato: "yes"}});      
}





