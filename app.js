//Variable donde se ingresa el framework

//Crea servidor que responda las peticiones de los usuarios
var express = require('express');

var mongoose = require('mongoose');

//Leer informacion, pasarla a cadena para que podamos procesar 
//la informacion y guardarla en a base de datos (parsing)
var bodyParser =require('body-parser');

//Leer archivos
var multer = require('multer');
var cloudinary = require('cloudinary');

var method_override = require('method-override')
var Schema = mongoose.Schema;

//Configurar cloudinary
cloudinary.config({
	cloud_name: "diegovaldes",
	api_key: "618626112935442",
	api_secret: "iS_qjOKZkJ8sjThlFlZBkKyqDaU"
});

var app_password = "admin";

//Objeto en donde sobre el cual podemos ejecutar 
//los metodos que nos permitira ejecutar la pagina
var app = express();

//Conectar a base de datos
mongoose.connect("mongodb://localhost/ucab");

//Se le dice a express que se utilizara body parser para parsear 
//los parametros que vengan en una peticion post
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

//Decirle a express que utilice multer y almacene temporalmente en la carpeta upload
//Ya que luego esas imagenes se subiran a la nube de cloudinary
app.use(multer({dest: "./uploads"}));

//Definir los schema
var userSchemaJSON = {
	nombre: String,
	apellido: String,
	email: String,
	username: String,
	password: String,
};

var userSchema = new Schema(userSchemaJSON);
var Usuarios = mongoose.model("Usuarios", userSchema);

var publicacionSchemaJSON = {
	_estado: {
		titulo: String,
		imageURL: String,
		preguntas: {
			p1: String,
			p2: String,
			p3: String
		}
	},
	fotoURL: String,
	coordenadas: String,
	fecha: Date,
	respuestas: {
		r1: String,
		r2: String,
		r3: String,
	},
	_usuario: {
		nombre: String,
		apellido: String,
		email: String,
		username: String,
		password: String,
	}
}

var publicacionSchema = new Schema(publicacionSchemaJSON);
var Publicacion = mongoose.model("Publicacion", publicacionSchema);

var estadoSchemaJSON = {
	titulo: String,
	imageURL: String,
	preguntas: {
		p1: String,
		p2: String,
		p3: String
	}
}

var estadoSchema = new Schema(estadoSchemaJSON);
var Estado = mongoose.model("Estado", estadoSchema);

//Se le indica a la app que el engine de las vistas lo hara jade
app.set("view engine", "jade");

//Carpeta en donde estaran las vistas
app.use(express.static("public"));

//Sobrescribe el metodo basado en un parametro _method donde viene el verdadero metodo
app.use(method_override("_method"));

//Crear servidor
app.listen(8080);


//////////////////////////////////////////////

app.get("/", function(solicitud,respuesta){
	respuesta.render("index");
});

//Login
app.post("/login", function(solicitud, respuesta){
var conectado = false;

	if(solicitud.body.username == "admin" && solicitud.body.password == "admin"){
		respuesta.redirect("/admin");
	}
	else{
		Usuarios.findOne({username: solicitud.body.username}, function(error,user){
			if(error){ 
				console.log(error); 
			}
			if(user!=null && user.username == solicitud.body.username && user.password == solicitud.body. password){
				conectado = true;	
			}
			if(conectado){
				respuesta.redirect("/timeline/"+user.id);
			}
			else{
				respuesta.redirect("/");
			}
		});
	}	
});

//Admin
app.get("/admin", function(solicitud,respuesta){
	respuesta.render("admin/index");
});

/////////////////////////////Encuestas///////////////////////////
app.get("/admin/encuestas", function(solicitud, respuesta){
	Estado.find(function(error,documento){
		if(error){ 
			console.log(error); 
		}
		respuesta.render("admin/encuestas",{ estados: documento })
	});
});

//Crear nuevo estado
app.get("/admin/new", function(solicitud,respuesta){
	respuesta.render("admin/new");
});

app.post("/admin/new", function(solicitud,respuesta){
	
	var data_estado = {
		titulo: solicitud.body.titulo,
		imageURL: "",
		preguntas: {
			p1: solicitud.body.p1,
			p2: solicitud.body.p2,
			p3: solicitud.body.p3
		}
	}

	var estado = new Estado(data_estado);
	
	//Crear solamente con una imagen
	if(solicitud.files.hasOwnProperty("image")){
		cloudinary.uploader.upload(solicitud.files.image.path, function(result){
			estado.imageURL = result.url;

			estado.save(function(err){
				console.log(estado);
				respuesta.redirect("/admin/encuestas");
			});
		});
	}else{
		respuesta.redirect("/admin/new");
	}
});

//Actualizar item
app.get("/admin/edit/:id", function(solicitud,respuesta){
	var id_estado = solicitud.params.id;

	Estado.findOne({_id: id_estado}, function(error, estado){
		respuesta.render("admin/edit", {mood: estado});	
	});
});

app.put("/admin/edit/:id", function(solicitud, respuesta){
	var data_estado = {
		titulo: solicitud.body.titulo,
		preguntas : {
			p1: solicitud.body.p1,
			p2: solicitud.body.p2,
			p3: solicitud.body.p3	
		}
	};

	//Con imagen
	if(solicitud.files.hasOwnProperty("image")){
		cloudinary.uploader.upload(solicitud.files.image.path, 
		function(result){
			console.log(result);
			data_estado.imageURL = result.url;

			Estado.update({"_id": solicitud.params.id}, data_estado,function(){
				respuesta.redirect("/admin/encuestas");
			});
		});
	}else{	//Sin imagen
		Estado.update({"_id": solicitud.params.id}, data_estado,function(){
			respuesta.redirect("/admin/encuestas");
		});
	}
});

//Eliminar item
app.get("/admin/delete/:id", function(solicitud, respuesta){
	var id_estado = solicitud.params.id;

	Estado.findOne({"_id": id_estado}, function(error, estado){
		respuesta.render("admin/delete", {mood: estado});
	});	
});

app.delete("/admin/delete/:id", function(solicitud, respuesta){
	var id_estado = solicitud.params.id;

	if(solicitud.body.password == app_password){
		Estado.remove({"_id": id_estado}, function(err){
			if(err){console.log(err);}
			respuesta.redirect("/admin/encuestas");
		});
	}else{
		respuesta.redirect("/admin/encuestas");
	}
});

//////////////////////////////Bandeja/////////////////////////////
app.get("/admin/bandeja", function(solicitud, respuesta){
	Publicacion.find(function(error,publicaciones){
		if(error){ 
			console.log(error); 
		}	
		respuesta.render("admin/bandeja", {publicaciones: publicaciones});
	});
});

app.get("/publicacion/:id", function(solicitud, respuesta){
	var id_publicacion = solicitud.params.id;

	Publicacion.findOne({"_id": id_publicacion}, function(error, publicacion){
		respuesta.render("admin/publicacion", {publicacion: publicacion});
	});

});

/////////////////////////////Control de usuarios///////////////////
app.get("/admin/usuarios", function(solicitud, respuesta){
	Usuarios.find(function(error, users){
		if(error){
			console.log(error);
		}
		respuesta.render("admin/usuarios", {usuarios: users});
	});
});

app.get("/admin/deleteuser/:id", function(solicitud, respuesta){
	var id_usuario = solicitud.params.id;

	Usuarios.findOne({"_id": id_usuario}, function(error, usuario){
		respuesta.render("admin/deleteuser", {usuario: usuario});
	});	
});

app.delete("/admin/deleteuser/:id", function(solicitud, respuesta){
	var id_usuario = solicitud.params.id;

	if(solicitud.body.password == app_password){
		Usuarios.remove({"_id": id_usuario}, function(err){
			if(err){console.log(err);}
			respuesta.redirect("/admin/usuarios");
		});
	}else{
		respuesta.redirect("/admin/usuarios");
	}
});

//////////////////////////////Registro////////////////////////////
app.get("/registro", function(solicitud, respuesta){
	respuesta.render("registro/index");
});

app.post("/registro", function(solicitud, respuesta){
	var data = {
		nombre: solicitud.body.nombre,
		apellido: solicitud.body.apellido,
		email: solicitud.body.email,
		username: solicitud.body.username,
		password: solicitud.body.password,
	}

	var usuario = new Usuarios(data);

	Usuarios.findOne({username: solicitud.body.username}, function(error,user){
		if(user!=null && user.username == solicitud.body.username){
			respuesta.render("registro/index", {mensaje: "Usuario existente/Datos invalidos."});
		}else{
			//if(solicitud.body.email.search("@ucab.edu.ve") == -1){
			if(solicitud.body.email.search("@gmail.com") == -1){
				respuesta.render("registro/index", {mensaje: "Correo invalido."});
			}else{
				usuario.save(function(err){
					console.log(usuario);
					respuesta.redirect("/confirmacion");
				});
			}
		}
	});
});

app.get("/confirmacion", function(solicitud, respuesta){
	respuesta.render("registro/confirmacion");
});

//////////////////////////Usuario///////////////////////////////

//Sala situacional
app.get("/timeline/:id", function(solicitud, respuesta){
	
	Publicacion.find(function(error,publicaciones){
		Usuarios.findOne({"_id": solicitud.params.id}, function(error,user){
			respuesta.render("user/index", {publicaciones: publicaciones, usuario: user});
		});
	});
});

///////////////////////////Android////////////////////////////
app.get("/android", function(solicitud, respuesta){
	Estado.find(function(error, estados){
		respuesta.status(200).jsonp(estados);
	});
});

app.get("/prueba", function(solicitud, respuesta){
	Estado.find(function(error, estados){
		respuesta.status(200).jsonp(estados);
	});
});

/////////////////////////Plan B/////////////////////////////
app.get("/publicar/:id", function(solicitud, respuesta){
	Usuarios.findOne({"_id": solicitud.params.id}, function(error,user){
		Estado.find(function(error, estados){
			respuesta.render("user/publicar", {usuario: user, estados: estados});
		});
	});
});

app.post("/publicar/:id", function(solicitud, respuesta){
	Usuarios.findOne({"_id": solicitud.params.id}, function(error,user){
		respuesta.redirect("/publicar/"+solicitud.params.id+"/"+solicitud.body.mood);
	});
});

app.get("/publicar/:id/:estado", function(solicitud, respuesta){
	Usuarios.findOne({"_id": solicitud.params.id}, function(error,user){
		Estado.findOne({"titulo": solicitud.params.estado}, function(error,estado){
			respuesta.render("user/llenar", {usuario: user, estado: estado});
		});
	});
});

app.post("/publicar/llenar/:id", function(solicitud, respuesta){
	Usuarios.findOne({"_id": solicitud.params.id}, function(error,user){
		Estado.findOne({"_id": solicitud.body.mood}, function(error,estado){
			var data_publicacion = {
				_estado: estado,
				coordenadas: "",
				fotoURL: "",
				fecha: new Date(),
				respuestas: {
					r1: solicitud.body.r1,
					r2: solicitud.body.r2,
					r3: solicitud.body.r3
				},
				_usuario: user
			}

			var publicacion = new Publicacion(data_publicacion);

			//Crear solamente con una imagen
			if(solicitud.files.hasOwnProperty("foto")){
				cloudinary.uploader.upload(solicitud.files.foto.path, function(result){
					console.log(result);

					publicacion.fotoURL = result.url;

					publicacion.save(function(err){
						console.log(publicacion);
						respuesta.redirect("/timeline/"+solicitud.params.id);
					});
				}, { width: 800, height: 600, crop: "limit" });
			}else{
				respuesta.redirect("/publicar/"+solicitud.params.id+"/"+estado.titulo, {usuario: user});
			}
		});		
	});
});