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


//home page
app.get("/", function (req, res) {
   
   res.render("index", { 
      message: ""
   });

});

//Sottomissione del form in home page
app.post("/", function (req, res) {
   var address = req.body.address;
   var city = req.body.city;
   console.log(address + " " + city);
      
   //Verifichaimo se il posto inserito è già esistente
   //Dobbiamo usare find enon findOne perchè quest'ultima non funziona come dovrebbe
   client.db("save_your_place").collection("posto").find({indirizzo: address.toUpperCase(), citta: city.toUpperCase()}).toArray(function(err, result) {
      
      if (err) throw err;
      var mess="PLACE ADDED WITH SUCCESS";

      if(result.length > 0)
         mess = "ERROR: THE PLACE ALREADY EXISTS"
      else 
         add({indirizzo: address.toUpperCase(), citta: city.toUpperCase(), completato: "no"});
      
      res.render("index", { 
         message: mess
      });
      });

})

//posti
app.get("/posti", function (req, res) {
   
   client.db("save_your_place").collection("posto").find({completato: "no"}).sort({citta: 1, indirizzo: 1}).toArray(function(err, result) {
      if (err) throw err;
      var mess = ""; 
      if(result.length== 0)
      mess = "THERE ARE NO PLACES. ADD SOME PLACES!";

      res.render("posti", { 
         listaPosti: result,
         message: mess
      });
   });
   
});

//Quando si completa un posto
app.post("/posti", function (req, res) {
   var address = req.body.address;
   var city = req.body.city;

   //Aggiorna il posto come completato
   update(address, city);

    //Ricarica la pagina
   res.redirect("/posti");
   
   //Contiamo i posti completati. La funzione count() di mongodb non funziona
   client.db("save_your_place").collection("posto").find({completato: "yes"}).toArray(function(err, result) {
      if (err) throw err;

      var numberOfPlaces = 0;
      result.forEach( element => {
         numberOfPlaces++;
      })
      //Aggiorniamo gli obiettivi sul numero di posti da vedere
   client.db("save_your_place").collection("obiettivo").find({tipo: "ep", completato: "no" }).toArray(function(err, result) {
      if (err) throw err;
      result.forEach( element => { 
         console.log(numberOfPlaces);
         if(element.punti <= numberOfPlaces)
         client.db("save_your_place").collection("obiettivo").updateOne({descrizione: element.descrizione, tipo: element.tipo}, {$set: {completato: "yes"}});   
      })
   })
   })

   //Contiamo i posti completati nella stessa città di quello appena completato.
   client.db("save_your_place").collection("posto").find({citta: city, completato: "yes"}).toArray(function(err, result) {
      if (err) throw err;

      var numberOfPlaces = 0;
      result.forEach( element => {
         numberOfPlaces++;
      })

   //Aggiorniamo gli obiettivi sul numero di città da vedere
   client.db("save_your_place").collection("obiettivo").find({tipo: "ec", completato: "no" }).toArray(function(err, result) {
      if (err) throw err;
      result.forEach( element => { 
         console.log(numberOfPlaces);
         if(element.punti <= numberOfPlaces)
         client.db("save_your_place").collection("obiettivo").updateOne({descrizione: element.descrizione, tipo: element.tipo}, {$set: {completato: "yes"}});   
      })
   })
   
   })

})

//posti completati
app.get("/posti_completati", function (req, res) {
     client.db("save_your_place").collection("posto").find({completato: "yes"}).sort({citta: 1, indirizzo: 1}).toArray(function(err, result) {
      if (err) throw err;

      var mess = ""; 
      if(result.length == 0)
      mess = "THERE ARE NO PLACES. EXPLORE SOME PLACES!";

      res.render("posti_completati", { 
         listaPosti: result, 
         message: mess
      });

   });
});

app.get("/sfide", function (req, res) {
   //Conta i punti e calcola il livello
   client.db("save_your_place").collection("obiettivo").find({completato: "yes"}).toArray(function(err, result) {
      if (err) throw err;

      var points = 0;
      let level;
      result.forEach(element => {
         points += element.punti;
      });

      //Livello
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

      //Mostra gli obiettivi non completati
      client.db("save_your_place").collection("obiettivo").find({completato: "no"}).toArray(function(err, result) {
         if (err) throw err;
         
         var mess = ""; 
         if(result.length == 0)
         mess = "ALL THE ACHIEVEMENTS ARE COMPLETED!";
   
         res.render("sfide", { 
            obiettivi: result,
            livello:level, 
            punti: points,
            message: mess 
         });
      });
   });
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
   const it = client.db("save_your_place").collection("posto").updateOne({indirizzo: address, citta:city}, {$set: {completato: "yes"}});   
}





