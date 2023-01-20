
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as agw from 'aws-cdk-lib/aws-apigateway';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import {StackProps, Stack } from 'aws-cdk-lib';

export type VpcProps = {
  serviceName: string,
  cidr: string,
  azs?: number ,
  stackProps?: StackProps,
}

export class VpcConstructStack extends Stack{

  public readonly vpc:ec2.Vpc;

  constructor(scope: Construct, id: string, props: VpcProps){
    super(scope, id, props.stackProps);

    //AWS Nat GateWay대신에 instance 생성해서 nat instance로 사용
    const natGatewayProvider = ec2.NatProvider.instance({
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
    });
    
    //mask는 24면 2^8 - 5 = 251개씩 사용 가능
    const vpc = new ec2.Vpc(this, 'vpc', { 
      vpcName: `${props.serviceName}-vpc`,
      maxAzs: props.azs?? 3,
      cidr: props.cidr,
      natGateways: 1,
      natGatewayProvider: natGatewayProvider,
      subnetConfiguration: [
        { name: 'isolate', cidrMask: 24, subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        { name: 'private', cidrMask: 24, subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
        { name: 'public' , cidrMask: 24, subnetType: ec2.SubnetType.PUBLIC           },
      ],
      
    });

    this.vpc = vpc;
  }
}