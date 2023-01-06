
import { Environment, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as rds from 'aws-cdk-lib/aws-rds';

export type RdsConstructProps = {
  vpc: ec2.Vpc,
  port: number,
  engine: rds.IInstanceEngine,
  dbName: string,
  allocatedStorageGb: number,
  instanceType: ec2.InstanceType,
  dbAdminName: string,
  dbKeyName: string,
  stackProps?: StackProps,
} 

export class RdsConstructStack extends Stack{
  public readonly db:rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props: RdsConstructProps){
    super(scope, id, props.stackProps);

    const securityGroupName =  `${props.dbName}-rds-securityGroup`;
    const subnetGroupName =  `${props.dbName}-rds-subnetGroup`;

    const vpc = props.vpc;

    const cred = new rds.DatabaseSecret(this, 'dbSecret', {
      username: props.dbAdminName,
      secretName: props.dbKeyName,
    });

    const subnetGroup = new rds.SubnetGroup(this, 'subnetGroupt', {
      subnetGroupName: subnetGroupName,
      vpc,
      vpcSubnets: {subnetType: ec2.SubnetType.PRIVATE_ISOLATED},
      description: `${props.dbName} subnet group`
    })

    const rdsSecurityGroup = new ec2.SecurityGroup(this, 'RdsSecurityGroup', { 
      securityGroupName: securityGroupName,
      vpc,
      allowAllOutbound: true,
    });

    rdsSecurityGroup.addIngressRule(ec2.Peer.ipv4(props.vpc.vpcCidrBlock), ec2.Port.tcp(props.port));

    /*
    vpc.isolatedSubnets.forEach( (subnet) =>{
      rdsSecurityGroup.addIngressRule(ec2.Peer.ipv4(subnet.ipv4CidrBlock), ec2.Port.tcp(props.port));
    })
    */
   
    const db = new rds.DatabaseInstance(this, 'RdsInstance', {
      databaseName: props.dbName,
      vpc,
      port: props.port,
      engine: props.engine,
      instanceType: props.instanceType,
      allocatedStorage: props.allocatedStorageGb,
      credentials: rds.Credentials.fromSecret(cred),
      storageEncrypted: false, 
      removalPolicy: RemovalPolicy.DESTROY,
      publiclyAccessible: false,
      securityGroups: [rdsSecurityGroup],
      subnetGroup: subnetGroup,
    });

    this.db = db;
  }
}