import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;

public class Server {
    public static void main(String[] args) throws Exception {
        int port = 8080;
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        
        server.createContext("/", new StaticFileHandler());
        server.createContext("/api/login", new ApiHandler("{\"status\":\"success\",\"message\":\"Logged in successfully\"}"));
        server.createContext("/api/signup", new ApiHandler("{\"status\":\"success\",\"message\":\"Account created\"}"));
        server.createContext("/api/start-lab", new ApiHandler("{\"status\":\"success\",\"message\":\"Lab started\"}"));
        server.createContext("/api/end-lab", new ApiHandler("{\"status\":\"success\",\"message\":\"Lab ended\"}"));
        
        server.setExecutor(null);
        server.start();
        System.out.println("Server started on port " + port);
        System.out.println("Access the web application at: http://localhost:" + port);
    }

    static class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange t) throws IOException {
            String path = t.getRequestURI().getPath();
            if (path.equals("/")) {
                path = "/index.html";
            }
            // Use user workspace root dir '.' 
            File file = new File("." + path);
            if (file.exists() && !file.isDirectory()) {
                String contentType = "text/plain";
                if (path.endsWith(".html")) contentType = "text/html";
                else if (path.endsWith(".css")) contentType = "text/css";
                else if (path.endsWith(".js")) contentType = "application/javascript";
                
                t.getResponseHeaders().set("Content-Type", contentType);
                t.sendResponseHeaders(200, file.length());
                OutputStream os = t.getResponseBody();
                FileInputStream fs = new FileInputStream(file);
                final byte[] buffer = new byte[0x10000];
                int count = 0;
                while ((count = fs.read(buffer)) >= 0) {
                    os.write(buffer, 0, count);
                }
                fs.close();
                os.close();
            } else {
                String response = "404 (Not Found)\n";
                t.sendResponseHeaders(404, response.length());
                OutputStream os = t.getResponseBody();
                os.write(response.getBytes());
                os.close();
            }
        }
    }

    static class ApiHandler implements HttpHandler {
        private final String response;
        public ApiHandler(String response) {
            this.response = response;
        }
        @Override
        public void handle(HttpExchange t) throws IOException {
            t.getResponseHeaders().set("Content-Type", "application/json");
            t.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            
            // Allow POST, GET, OPTIONS
            if (t.getRequestMethod().equalsIgnoreCase("OPTIONS")) {
                t.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                t.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type,Authorization");
                t.sendResponseHeaders(204, -1);
                return;
            }
            
            t.sendResponseHeaders(200, response.length());
            OutputStream os = t.getResponseBody();
            os.write(response.getBytes());
            os.close();
        }
    }
}