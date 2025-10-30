import Consul from "consul";

const consul = new Consul({
  host: process.env.CONSUL_HOST || "localhost",
  port: process.env.CONSUL_PORT || "8500",
  promisify: true,
});

const registerService = async (
  serviceName,
  servicePort,
  serviceHost = "localhost"
) => {
  const serviceId = `${serviceName}-${servicePort}`;

  const details = {
    id: serviceId,
    name: serviceName,
    address: serviceHost,
    port: parseInt(servicePort),
    check: {
      http: `http://${serviceHost}:${servicePort}/health`,
      interval: "10s",
      timeout: "5s",
    },
  };

  try {
    await consul.agent.service.register(details);
    console.log(
      `✅ Service ${serviceName} registered with Consul at ${serviceHost}:${servicePort}`
    );

    // Deregister on shutdown
    const gracefulShutdown = async () => {
      try {
        await consul.agent.service.deregister(serviceId);
        console.log(`🔴 Service ${serviceName} deregistered from Consul`);
        process.exit(0);
      } catch (err) {
        console.error("Error deregistering service:", err);
        process.exit(1);
      }
    };

    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);
  } catch (err) {
    console.error(`❌ Failed to register service ${serviceName}:`, err.message);
  }
};

const getServiceAddress = async (serviceName) => {
  try {
    const services = await consul.health.service({
      service: serviceName,
      passing: true,
    });

    if (services.length === 0) {
      throw new Error(`No healthy instances of ${serviceName} found`);
    }

    // Simple round-robin: pick first healthy instance
    const service = services[0].Service;
    return `http://${service.Address}:${service.Port}`;
  } catch (err) {
    console.error(`Error getting service ${serviceName}:`, err.message);
    throw err;
  }
};

export { registerService, getServiceAddress, consul };
