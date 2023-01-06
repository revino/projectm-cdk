
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as agw from 'aws-cdk-lib/aws-apigateway';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import {StackProps, Stack, CfnOutput } from 'aws-cdk-lib';
import { VpcEndpointService } from 'aws-cdk-lib/aws-ec2';
import { SSL_OP_NO_SSLv2 } from 'constants';

export type VpcProps = {
  serviceName: string,
  cidr: string,
  azs?: number ,
  stackProps?: StackProps,
}

export class VpcConstructStack extends Stack{

  public readonly vpc:ec2.Vpc;
  public readonly endpointService:ec2.VpcEndpointService;
  public readonly loadbalancer: elb.NetworkLoadBalancer;

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
      natGateways: 0,
      natGatewayProvider: natGatewayProvider,
      subnetConfiguration: [
        { name: 'isolate', cidrMask: 24, subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        { name: 'private', cidrMask: 24, subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
        { name: 'public' , cidrMask: 24, subnetType: ec2.SubnetType.PUBLIC           },
      ],
      /* 비용 문제로 private endpoint 제거
      gatewayEndpoints: {
        S3: {
          service: ec2.GatewayVpcEndpointAwsService.S3,
        },
      },
      */
    });

    /* 비용 문제로 private endpoint 제거
    const serviceList = [
      {name:'ecr'       , service:ec2.InterfaceVpcEndpointAwsService.ECR           },
      {name:'ecr-docker', service:ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER    },
      {name:'ecr-agent' , service:ec2.InterfaceVpcEndpointAwsService.ECS_AGENT     },
      {name:'ecs-tel'   , service:ec2.InterfaceVpcEndpointAwsService.ECS_TELEMETRY },
      {name:'ecs'       , service:ec2.InterfaceVpcEndpointAwsService.ECS           },
      {name:'secret'    , service:ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER},
      {name:'sqs'       , service:ec2.InterfaceVpcEndpointAwsService.SQS},
    ]    
       
    serviceList.forEach( el => 
      vpc.addInterfaceEndpoint(el.name, {
        service: el.service
    }));
    */
    const nlb = new elb.NetworkLoadBalancer(this, 'nlb', {
      loadBalancerName: `${props.serviceName}-nlb`,
      vpc,
      crossZoneEnabled: false,
      internetFacing: false,
    });

    const endpointService = new ec2.VpcEndpointService(this, 'endpointService', {
      vpcEndpointServiceLoadBalancers: [ nlb ],
      acceptanceRequired: false,    
    });
  
    this.endpointService = endpointService;
    this.loadbalancer = nlb;
    this.vpc = vpc;
  }
}