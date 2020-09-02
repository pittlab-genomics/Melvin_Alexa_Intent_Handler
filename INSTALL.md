# Installing Dependencies

## Install the AWS CLI version 2 on Linux
https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html

1. Download the installation file:
```
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
```

2. Unzip the installer. If your Linux distribution doesn't have a built-in unzip command, use an equivalent to unzip it. The following example command unzips the package and creates a directory named aws under the current directory.

```
unzip awscliv2.zip
```

3. Run the install program. The installation command uses a file named install in the newly unzipped aws directory. By default, the files are all installed to /usr/local/aws-cli, and a symbolic link is created in /usr/local/bin. The command includes sudo to grant write permissions to those directories.

```
sudo ./aws/install
```

4. Confirm the installation.

```
aws --version
```

## Quick configuration with aws configure
https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html

1. For general use, the aws configure command is the fastest way to set up your AWS CLI installation. When you enter this command, the AWS CLI prompts you for four pieces of information:

 - Access key ID
 - Secret access key
 - AWS Region
 - Output format

 The following example shows sample values. Replace them with your own values as described in the following sections.
```
$ aws configure
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name [None]: us-west-2
Default output format [None]: json
```

2. set environment variables to override any settings if needed (optional)
https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html
The following examples show how you can configure environment variables for the default user.

Linux or macOS
```
$ export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
$ export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
$ export AWS_DEFAULT_REGION=us-west-2
```

## Installing Node.js
Serverless is a Node.js CLI tool so the first thing you need to do is to install Node.js on your machine.
https://nodejs.org/en/download/

Node.js v10.x:
```
# Using Ubuntu
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get install -y nodejs

# Using Debian, as root
curl -sL https://deb.nodesource.com/setup_10.x | bash -
apt-get install -y nodejs
```


## Installing the Serverless Framework

Install the Serverless Framework via npm which was already installed when you installed Node.js.
https://www.serverless.com/framework/docs/providers/aws/guide/installation/

```
npm install -g serverless
```

- Install npm modules without sudo permissions
Do not use `sudo` when running/installing npm packages. Read the following blog to understand why. Trust me, it's bad
https://medium.com/@ExplosionPills/dont-use-sudo-with-npm-still-66e609f5f92

- Set npm `PREFIX` param to set a target directory for global installations
`npm config set prefix ~/.npm`


- To see which version of serverless you have installed run:
```
serverless --version
```

## Setup with serverless config credentials command
Serverless provides a convenient way to configure AWS profiles with the help of the serverless config credentials command.

Here's an example how you can configure the default AWS profile:
```
serverless config credentials --provider aws --key AKIAIOSFODNN7EXAMPLE --secret wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

# Clone the Git repository and submodules

1. Clone the main Git repo
```
git clone https://gitlab.com/PittGenomics/melvin_alexa_intent_handler.git
```

2. Initialize submodules
```
git submodule update --init --recursive
```

# Deploy service to an environment

1. Run sls command:
```
sls deploy -s <env>
```

<env> could be either `dev` or `uat`
`dev` environment is used for testing purposes (linked to "Develop Melvin" Alexa skill) while `uat` environment is linked in Melvin proper Alexa skill

2. Open Alexa developer console
https://developer.amazon.com/alexa/console/ask

3. Navigate to "Melvin" skill and goto "Test" section
Start a conversation by typing text or voice recording option