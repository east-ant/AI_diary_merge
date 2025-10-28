const { MongoClient } = require("mongodb");

const uri = "mongodb://127.0.0.1:27017";

async function main() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("MongoDB connected");

        const db = client.db("diary");
        const users = db.collection("users");

        await users.insertOne({ name: "Dasol", age: 21 });
        console.log("User inserted");

        const found = await users.findOne({ name: "Dasol" });
        console.log("Found", found);

        await users.updateOne({ name: "Dasol" }, { $set: { age: 22 } });
        console.log("user updated");

        const updated = await users.findOne({ name: "Dasol" });
        console.log("updated", updated);
        
        await users.deleteOne({ name: "Dasol" });
        console.log("user deleted");

    } catch (err) {
        console.error("error:", err);
    } finally {
        await client.close();
        console.log("MongoDB connection closed")
    }
}

main();