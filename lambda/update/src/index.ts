import { Handler } from "aws-lambda";
import * as AWS from "aws-sdk";
import { env } from "process";

const FAMILY = process.env.TASK_DEF_FAMILY!;
const SERVICE = process.env.SERVICE!;
const CLUSTER = process.env.CLUSTER!;

const getTaskDef = (
  ecs: AWS.ECS
): Promise<AWS.ECS.DescribeTaskDefinitionResponse> => {
  return new Promise((res, rej) => {
    ecs.describeTaskDefinition({ taskDefinition: FAMILY }, (err, data) => {
      if (err) rej(err);
      else res(data);
    });
  });
};

const updateTaskDef = (
  ecs: AWS.ECS,
  container: AWS.ECS.ContainerDefinition,
  task: AWS.ECS.TaskDefinition
): Promise<void> => {
  return new Promise((res, rej) => {
    const params: AWS.ECS.RegisterTaskDefinitionRequest = {
      containerDefinitions: [
        {
          name: container.name,
          image: container.image,
          cpu: container.cpu,
          memory: container.memory,
          portMappings: container.portMappings,
          essential: container.essential,
          environment: container.environment,
          secrets: container.secrets,
          logConfiguration: container.logConfiguration,
        },
      ],
      family: FAMILY,
      taskRoleArn: task.taskRoleArn,
      executionRoleArn: task.executionRoleArn,
      networkMode: task.networkMode,
      volumes: task.volumes,
      requiresCompatibilities: task.requiresCompatibilities,
      cpu: task.cpu,
      memory: task.memory,
    };

    ecs.registerTaskDefinition(params, (err, data) => {
      if (err) {
        console.log(params);
        rej(err);
      }
      res();
    });
  });
};

const updateService = (ecs: AWS.ECS): Promise<void> => {
  return new Promise((res, rej) => {
    const params: AWS.ECS.UpdateServiceRequest = {
      service: SERVICE,
      taskDefinition: FAMILY,
      cluster: CLUSTER,
    };
    ecs.updateService(params, (err, data) => {
      if (err) rej(err);
      res();
    });
  });
};

export const handler: Handler = async (event, context) => {
  const ecs = new AWS.ECS();

  let { image, environment } = event;
  if (!environment) environment = [];

  const currentTaskDef = (await getTaskDef(ecs)).taskDefinition!;

  const containerDefinition = {
    ...currentTaskDef.containerDefinitions![0],
  };

  containerDefinition.image = image;
  const filteredEnv = containerDefinition.environment!.filter(
    (env) =>
      !environment.find(({ name }: { name: string }) => env.name === name)
  );
  containerDefinition.environment = [...filteredEnv, ...environment];

  await updateTaskDef(ecs, containerDefinition, currentTaskDef);
  await updateService(ecs);
};
