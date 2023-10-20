import request from "supertest";
import { describe, afterAll, beforeEach, beforeAll } from "@jest/globals";
import sanitizedConfig from "../../../config/config";
import { initializeDependencias } from "../../dependencias";
import { Application } from "../../dependencias";
import { cleanupDatabase } from "./auxilaryFunctionsForTests/cleanup";
import { loginUser } from "./auxilaryFunctionsForTests/loginUser";
import { getAllDevices } from "./auxilaryFunctionsForTests/getAllDevices";
import { addSwitch } from "./auxilaryFunctionsForTests/addSwitch";
const requestUri = `http://localhost:${sanitizedConfig.PORT}`;

describe("API ADD DEVICE TEST", () => {
  const badRequestResponse = {
    BadRequest: `For meters request must contain following parameters:\n 
  {deviceType: string, name:string, parameters:{[key:string]: sting}, commandOn:string}\n
  For switches request must contain following parameters:\n 
  {deviceType: string, name:string, commandOn:string, commandOff: string}`,
  };
  let app: Application;
  let token: string;
  beforeAll(async () => {
    app = await initializeDependencias();
  });
  beforeEach(async () => {
    await cleanupDatabase(app.databaseInstance.connection);
    app.devicesInMemory.devices.clear();
    token = await loginUser(requestUri, "testPassword");
  });

  test("Should add switch to database and inMemoryStorage:", async () => {
    const response = await request(requestUri)
      .post(`/devices`)
      .set("Authorization", token)
      .send({
        deviceType: "switch",
        name: "switch1",
        commandOn: "switch on",
        commandOff: "switch off",
      })
      .expect(201)
      .expect("Content-Type", /application\/json/);
    const deviceId = response.body.deviceId;
    const devicesInMemory = app.devicesInMemory.devices.get(deviceId);
    const [device] = await getAllDevices(app.databaseInstance.connection);

    expect(response.body).toHaveProperty("deviceId");
    expect(devicesInMemory).toEqual({
      id: deviceId,
      deviceType: "switch",
      name: "switch1",
      commandOn: "switch on",
      commandOff: "switch off",
    });

    expect(device).toMatchObject({
      id: deviceId,
      deviceType: "switch",
      name: "switch1",
      commandOn: "switch on",
      commandOff: "switch off",
    });
  });

  test("Should add meter to database and inMemoryStorage:", async () => {
    const response = await request(requestUri)
      .post(`/devices`)
      .set("Authorization", token)
      .send({
        deviceType: "meter",
        name: "meter1",
        parameters: { temperature: "oC", humidity: "%" },
        commandOn: "meter on",
      })
      .expect(201)
      .expect("Content-Type", /application\/json/);

    const deviceId = response.body.deviceId;
    const devicesInMemory = app.devicesInMemory.devices.get(deviceId);
    const [device] = await getAllDevices(app.databaseInstance.connection);

    expect(response.body).toHaveProperty("deviceId");
    expect(devicesInMemory).toEqual({
      id: deviceId,
      deviceType: "meter",
      name: "meter1",
      parameters: { temperature: "oC", humidity: "%" },
      commandOn: "meter on",
    });

    expect(device).toMatchObject({
      id: deviceId,
      deviceType: "meter",
      name: "meter1",
      parameters: { temperature: "oC", humidity: "%" },
      commandOn: "meter on",
    });
  });

  test.each([
    {
      name: "switch1",
      commandOn: "switch on",
      commandOff: "switch off",
    },
    {
      deviceType: "switch",
      commandOn: "switch on",
      commandOff: "switch off",
    },
    {
      deviceType: "switch",
      name: "switch1",
      commandOff: "switch off",
    },
    {
      deviceType: "switch",
      name: "switch1",
      commandOn: "switch on",
    },
    {
      deviceType: "switch",
      name: "switch1",
      commandOn: "switch on",
      commandOff: "switch off",
      id: "id1",
    },
    {
      deviceType: 1,
      name: "switch1",
      commandOn: "switch on",
      commandOff: "switch off",
    },
    {
      deviceType: "switch",
      name: 1,
      commandOn: "switch on",
      commandOff: "switch off",
    },
    {
      deviceType: "switch",
      name: "switch1",
      commandOn: 1,
      commandOff: "switch off",
    },
    {
      deviceType: "switch",
      name: "switch1",
      commandOn: "switch on",
      commandOff: 1,
    },
  ])("Should return error if bad request:", async (bodyRequest) => {
    const response = await request(requestUri)
      .post(`/devices`)
      .set("Authorization", token)
      .send(bodyRequest)
      .expect(400)
      .expect("Content-Type", /application\/json/);
    expect(response.body).toEqual(badRequestResponse);
  });

  [
    {
      description: "body lacks deviceType",
      body: {
        name: "switch1",
        commandOn: "switch on",
        commandOff: "switch off",
      },
    },
    {
      description: "body lacks name",
      body: {
        deviceType: "switch",
        commandOn: "switch on",
        commandOff: "switch off",
      },
    },
    {
      description: "body lacks commandOn",
      body: {
        deviceType: "switch",
        name: "switch1",
        commandOff: "switch off",
      },
    },
    {
      description: "body lacks commandOff",
      body: {
        deviceType: "switch",
        name: "switch1",
        commandOn: "switch on",
      },
    },

    {
      description: "body has additional parameter",
      body: {
        deviceType: "switch",
        name: "switch1",
        commandOn: "switch on",
        commandOff: "switch off",
        id: "id1",
      },
    },
    {
      description: "deviceType is a number",
      body: {
        deviceType: 1,
        name: "switch1",
        commandOn: "switch on",
        commandOff: "switch off",
      },
    },
    {
      description: "name is a number",
      body: {
        deviceType: "switch",
        name: 1,
        commandOn: "switch on",
        commandOff: "switch off",
      },
    },
    {
      description: "commandOn is a number",
      body: {
        deviceType: "switch",
        name: "switch1",
        commandOn: 1,
        commandOff: "switch off",
      },
    },
    {
      description: "commandOff is a number",
      body: {
        deviceType: "switch",
        name: "switch1",
        commandOn: "switch on",
        commandOff: 1,
      },
    },
  ].forEach(({ description, body }) => {
    it(`Add switch should return bad request error if ${description}`, async () => {
      const response = await request(requestUri)
        .post(`/devices`)
        .set("Authorization", token)
        .send(body)
        .expect(400)
        .expect("Content-Type", /application\/json/);
      expect(response.body).toEqual(badRequestResponse);
    });
  });

  [
    {
      description: "body lacks deviceType",
      body: {
        name: "meter1",
        parameters: { temperature: "oC", humidity: "%" },
        commandOn: "meter on",
      },
    },
    {
      description: "body lacks name",
      body: {
        deviceType: "meter",
        parameters: { temperature: "oC", humidity: "%" },
        commandOn: "meter on",
      },
    },
    {
      description: "body lacks parameters",
      body: {
        name: "meter1",
        deviceType: "meter",
        commandOn: "meter on",
      },
    },

    {
      description: "body lacks commandOn",
      body: {
        deviceType: "meter",
        name: "meter1",
        parameters: { temperature: "oC", humidity: "%" },
      },
    },

    {
      description: "body has additional parameter",
      body: {
        deviceType: "meter",
        name: "meter1",
        parameters: { temperature: "oC", humidity: "%" },
        commandOn: "meter on",
        id: "id1",
      },
    },
    {
      description: "deviceType is a number",
      body: {
        deviceType: 1,
        name: "meter1",
        parameters: { temperature: "oC", humidity: "%" },
        commandOn: "meter on",
      },
    },
    {
      description: "name is a number",
      body: {
        deviceType: "meter",
        name: 1,
        parameters: { temperature: "oC", humidity: "%" },
        commandOn: "meter on",
      },
    },
    {
      description: "commandOn is a number",
      body: {
        deviceType: "meter",
        name: "meter1",
        parameters: { temperature: "oC", humidity: "%" },
        commandOn: 1,
      },
    },
    {
      description: "parameter is not an object",
      body: {
        deviceType: "meter",
        name: "meter1",
        parameters: "not an object",
        commandOn: "meter on",
      },
    },
  ].forEach(({ description, body }) => {
    it(`Add meter should return bad request error if ${description}`, async () => {
      const response = await request(requestUri)
        .post(`/devices`)
        .set("Authorization", token)
        .send(body)
        .expect(400)
        .expect("Content-Type", /application\/json/);
      expect(response.body).toEqual(badRequestResponse);
    });
  });

  test("Should not add device if not valid token:", async () => {
    const wrongToken = "120394985";

    const response = await request(requestUri)
      .post(`/devices`)
      .set("Authorization", wrongToken)
      .send({
        deviceType: "switch",
        name: "switch1",
        commandOn: "switch on",
        commandOff: "switch off",
      })
      .expect(401)
      .expect("Content-Type", /application\/json/);

    expect(response.body).toEqual({
      "Token validation error":
        "During token verification error occured: JsonWebTokenError: jwt malformed",
    });
  });

  test("Should not add device if token not provided", async () => {
    const response = await request(requestUri)
      .post(`/devices`)
      .send({
        deviceType: "switch",
        name: "switch1",
        commandOn: "switch on",
        commandOff: "switch off",
      })
      .expect(401)
      .expect("Content-Type", /application\/json/);

    expect(response.body).toEqual({
      Error: "Token reqired",
    });
  });

  test("Should return conflict error if device name already exists:", async () => {
    const deviceId = await addSwitch(
      requestUri,
      token,
      "switch",
      "switch1",
      "switch on",
      "switch off"
    );
    const response = await request(requestUri)
      .post(`/devices`)
      .set("Authorization", token)
      .send({
        deviceType: "switch",
        name: "switch1",
        commandOn: "switchchchchch on",
        commandOff: "switch off",
      })
      .expect(409)
      .expect("Content-Type", /application\/json/);
    expect(response.body).toEqual({ConflictError: "Device not added due error: MongoServerError: Unique violation error: NameConflictError"});

    const [...devicesInMemoryKeys] = app.devicesInMemory.devices.keys();
    const deviceInMemory = app.devicesInMemory.devices.get(deviceId);
    const [device] = await getAllDevices(app.databaseInstance.connection);
    expect(devicesInMemoryKeys).toEqual([deviceId]);

    expect(deviceInMemory).toEqual({
      id: deviceId,
      deviceType: "switch",
      name: "switch1",
      commandOn: "switch on",
      commandOff: "switch off",
    });

    expect(device).toMatchObject({
      id: deviceId,
      deviceType: "switch",
      name: "switch1",
      commandOn: "switch on",
      commandOff: "switch off",
    });
  });

  afterAll(async () => {
    await app.databaseInstance.connection.close();
    await app.appServer.stopServer();
  });
});
