"use client";

/**
 * BankTransferDetails Component
 * 
 * NOTE: This component is NOT currently used in the Stripe Connect flow.
 * When using Stripe Connect with BACS Direct Debit, Stripe handles all payment
 * UI automatically including showing bank details to customers.
 * 
 * This component is preserved for potential future use cases:
 * - Manual bank transfer reconciliation outside Stripe
 * - Displaying transfer status/reference to customers after payment
 * - Alternative payment flows
 * 
 * Current flow: Customer selects BACS in Stripe Checkout → Stripe shows details
 */

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, Check, Clock } from "lucide-react";
import { toast } from "sonner";

interface BankTransferDetailsProps {
    jobTitle: string;
    amount: number; // Amount in pounds
    reference: string;
    accountName?: string; // Optional bank account details if needed
    sortCode?: string;
    accountNumber?: string;
}

export function BankTransferDetails({ 
    jobTitle, 
    amount, 
    reference,
    accountName = "Stripe (via Need A Tradesman)",
    sortCode = "Provided by Stripe",
    accountNumber = "Provided by Stripe"
}: BankTransferDetailsProps) {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            toast.success("Copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy");
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
        }).format(value);
    };

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle>Bank Transfer Payment Details</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div>
                        <Label className="text-sm text-muted-foreground">Job</Label>
                        <p className="font-medium">{jobTitle}</p>
                    </div>

                    <div className="border-t pt-4">
                        <Label className="text-sm text-muted-foreground">Account Name</Label>
                        <p className="font-mono text-sm">{accountName}</p>
                    </div>

                    <div>
                        <Label className="text-sm text-muted-foreground">Sort Code</Label>
                        <p className="font-mono text-sm">{sortCode}</p>
                    </div>

                    <div>
                        <Label className="text-sm text-muted-foreground">Account Number</Label>
                        <p className="font-mono text-sm">{accountNumber}</p>
                    </div>

                    <div className="border-t pt-4">
                        <Label className="text-sm text-muted-foreground">Reference (IMPORTANT - Do not change)</Label>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="font-mono text-lg font-bold">{reference}</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(reference)}
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            This reference is essential for matching your payment to your job
                        </p>
                    </div>

                    <div>
                        <Label className="text-sm text-muted-foreground">Amount to Transfer</Label>
                        <p className="text-2xl font-bold">{formatCurrency(amount)}</p>
                    </div>

                    <div className="border-t pt-4 mt-4">
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Clock className="h-5 w-5 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-medium text-foreground">Processing Time</p>
                                <p className="mt-1">
                                    Bank transfers typically take 1-2 business days to process. 
                                    We&apos;ll notify you when your payment is received and your job can begin.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
