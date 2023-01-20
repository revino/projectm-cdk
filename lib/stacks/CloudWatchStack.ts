
import { Construct } from 'constructs';
import * as ecsp from 'aws-cdk-lib/aws-ecs-patterns';
import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

export type CloudWatchStackProps = {
  service: ecsp.NetworkLoadBalancedEc2Service,
  stackProps: StackProps,
} 


export class CloudWatchStack extends Stack{


  constructor(scope: Construct, id: string, props: CloudWatchStackProps){
    super(scope, id, props.stackProps);

    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: 'AutoScalingCpuUtil',
    });
  
    dashboard.applyRemovalPolicy(RemovalPolicy.DESTROY);
    
    const cpuUtilizationMetric = props.service.service.metricCpuUtilization({
      period: Duration.minutes(1),
      label: 'CPU Utilization',
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
          left: [cpuUtilizationMetric],
          width: 12,
          title: 'CPU Utilization'
      })
    );
  }
}