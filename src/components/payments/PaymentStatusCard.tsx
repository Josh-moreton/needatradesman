"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  DollarSign 
} from "lucide-react";
import { FinalPaymentModal } from "./FinalPaymentModal";

interface PaymentStatusCardProps {
  jobId: string;
  jobTitle: string;
  jobStatus: string;
  depositPaid: boolean;
  finalPaid: boolean;
  payoutReleased?: boolean;
  fullAmount?: number;
  depositAmount?: number;
  userRole: "CUSTOMER" | "TRADESPERSON";
  customerConfirmedComplete?: boolean;
  tradespersonConfirmedComplete?: boolean;
  onRefresh?: () => void;
}

export function PaymentStatusCard({
  jobId,
  jobTitle,
  jobStatus,
  depositPaid,
  finalPaid,
  payoutReleased = false,
  fullAmount = 0,
  depositAmount = 0,
  userRole,
  customerConfirmedComplete = false,
  tradespersonConfirmedComplete = false,
  onRefresh,
}: PaymentStatusCardProps) {
  const [finalPaymentModalOpen, setFinalPaymentModalOpen] = useState(false);

  const bothConfirmedComplete = customerConfirmedComplete && tradespersonConfirmedComplete;
  const remainingAmount = fullAmount - depositAmount;
  const needsFinalPayment = jobStatus === "COMPLETED" && depositPaid && !finalPaid && remainingAmount > 0;

  const getPaymentStatus = () => {
    if (!depositPaid) return "pending_deposit";
    if (depositPaid && !finalPaid && jobStatus !== "COMPLETED") return "deposit_paid";
    if (depositPaid && jobStatus === "COMPLETED" && !finalPaid) return "awaiting_final";
    if (finalPaid) return "completed";
    return "pending_deposit";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_deposit":
        return <Badge variant="destructive">Deposit Pending</Badge>;
      case "deposit_paid":
        return <Badge variant="secondary" className="text-blue-700 bg-blue-100">Deposit Paid</Badge>;
      case "awaiting_final":
        return <Badge variant="outline" className="text-amber-700 bg-amber-100">Final Payment Due</Badge>;
      case "completed":
        return <Badge variant="secondary" className="text-green-700 bg-green-100">Payment Complete</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const paymentStatus = getPaymentStatus();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Overall Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              {getStatusBadge(paymentStatus)}
            </div>

            {/* Payment Breakdown */}
            {fullAmount > 0 && (
              <div className="space-y-2 p-3 bg-muted rounded-md">
                <div className="flex justify-between text-sm">
                  <span>Total Amount:</span>
                  <span className="font-medium">£{fullAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    Deposit:
                    {depositPaid ? (
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    ) : (
                      <Clock className="h-3 w-3 text-amber-600" />
                    )}
                  </span>
                  <span className={depositPaid ? "text-green-700" : "text-amber-700"}>
                    £{depositAmount.toFixed(2)}
                  </span>
                </div>
                {remainingAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1">
                      Final Payment:
                      {finalPaid ? (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      ) : needsFinalPayment ? (
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                      ) : (
                        <Clock className="h-3 w-3 text-gray-400" />
                      )}
                    </span>
                    <span className={finalPaid ? "text-green-700" : needsFinalPayment ? "text-amber-700" : "text-gray-500"}>
                      £{remainingAmount.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Status Messages */}
            {userRole === "CUSTOMER" && (
              <div className="space-y-2">
                {!depositPaid && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">Deposit Payment Required</p>
                      <p className="text-amber-700">
                        Pay the deposit to secure your booking and start the job.
                      </p>
                    </div>
                  </div>
                )}

                {needsFinalPayment && (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <DollarSign className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800">Final Payment Due</p>
                      <p className="text-blue-700">
                        The job has been completed. Please make the final payment to complete the transaction.
                      </p>
                    </div>
                  </div>
                )}

                {finalPaid && (
                  <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-green-800">Payment Complete</p>
                      <p className="text-green-700">
                        All payments have been processed successfully.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {userRole === "TRADESPERSON" && (
              <div className="space-y-2">
                {depositPaid && !bothConfirmedComplete && (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800">Deposit Secured</p>
                      <p className="text-blue-700">
                        The customer has paid the deposit. Complete the job and confirm completion to receive payment.
                      </p>
                    </div>
                  </div>
                )}

                {finalPaid && !payoutReleased && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <Clock className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">Payment Processing</p>
                      <p className="text-amber-700">
                        Final payment received. Funds are being transferred to your account.
                      </p>
                    </div>
                  </div>
                )}

                {payoutReleased && (
                  <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-green-800">Payment Released</p>
                      <p className="text-green-700">
                        Funds have been transferred to your account. Check your bank for the deposit.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {userRole === "CUSTOMER" && needsFinalPayment && (
              <Button 
                onClick={() => setFinalPaymentModalOpen(true)}
                className="w-full"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Pay Final Amount (£{remainingAmount.toFixed(2)})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <FinalPaymentModal
        isOpen={finalPaymentModalOpen}
        onClose={() => setFinalPaymentModalOpen(false)}
        jobId={jobId}
        jobTitle={jobTitle}
        fullAmount={fullAmount}
        depositAmount={depositAmount}
      />
    </>
  );
}