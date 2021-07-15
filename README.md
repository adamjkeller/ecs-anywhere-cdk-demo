# ECS Anywhere CDK Demo

### Walkthrough

1. Deploy the stack

   ```bash
   cdk deploy --require-approval never
   ```

2. Once stack is deployed, we need to register an External container instance.
   For this demo, we will deploy an ECS instance using Docker in Docker for testing purposes.
   Check out the repo and build info by Jason Umiker [here](https://github.com/jasonumiker/ecsanywhere-dind).
   Clone the repo, build the docker image locally.Before we run it, we need to get an SSM activation key to register our instance into the cluster.This will happen in the next step.

   ```bash
   git clone git@github.com:jasonumiker/ecsanywhere-dind.git
   docker build -t ecsanywhere-dind .
   ```

3. Get activation key from SSM to register our instance into the cluster.
   We will store the values as environment variables that we will pass to the container at launch time.
   Next, launch the external instance.
   After this there is one more step!

   ```bash
   # Create activation id and code
   aws ssm create-activation --iam-role ECSAnywhereRegistration | tee ssm-activation.json

   # Store id and code as env vars
   export ACTIVATION_ID=$(cat ssm-activation.json| jq -r .ActivationId)
   export ACTIVATION_CODE=$(cat ssm-activation.json| jq -r .ActivationCode)

   # Run our ECS external instance
   docker run \
     -d \
     --privileged \
     --rm \
     -e ACTIVATION_ID=$ACTIVATION_ID \
     -e ACTIVATION_CODE=$ACTIVATION_CODE \
     -e CLUSTER_NAME=EcsAnywhereCDKDemo \
     -e REGION=$AWS_DEFAULT_REGION \
     --name ecsanywhere \
     -p 8080-8090:8080-8090 \
     ecsanywhere-dind:latest
   ```

4. Next, we need to exec into the ecsanywhere "instance" and download the setup script and run it.
   After the script runs and shows everything is good, navigate to the ECS console and you will see the External instance in the cluster!

   ```bash
   # Pull down setup script
   curl --proto "https" -o "/tmp/ecs-anywhere-install.sh" "https://amazon-ecs-agent.s3.amazonaws.com/ecs-anywhere-install-latest.sh"

   # Run setup script
   bash /tmp/ecs-anywhere-install.sh --region $REGION --cluster $CLUSTER_NAME --activation-id $ACTIVATION_ID --activation-code $ACTIVATION_CODE
   ```

5. Last step, go back into the service definition in the cdk code and change desiredCount to 1.
   Deploy the latest cdk code and the scheduler will schedule a single task onto the external instance.
   You can exec into the docker container and run a `docker ps` and you'll see the ecs agent running as well as the task. That's it!

   ```bash
   # Deploy the env
   cdk deploy

   # Exec into the container and check out the running containers
   docker exec -ti ecsanywhere /bin/bash
   docker ps
   ```
