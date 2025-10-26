"use client";
import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Eye, XIcon } from "lucide-react";
import { FaGoogle, FaFacebook } from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function ShiftDialog() {
    const navigate = useNavigate();

    const handleOpenShift = async () => {
        try {
            // أي عمليات تحقق أو API هنا
            toast.success("Shift opened successfully! Redirecting to home...");

            // ⏳ تأخير بسيط للسماح للتوست بالظهور قبل الانتقال
            setTimeout(() => {
                navigate("/");
            }, 1500);
        } catch (error) {
            console.error(error);
            toast.error("Failed to open shift. Please try again.");
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Take your shift
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex justify-between items-center">
                        <span>Open Shift</span>
                        <DialogClose asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <XIcon className="h-5 w-5" />
                            </Button>
                        </DialogClose>
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="email" className="w-full mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="email">Login</TabsTrigger>
                        <TabsTrigger value="social">Social</TabsTrigger>
                    </TabsList>

                    {/* Email Tab */}
                    <TabsContent value="email">
                        <div className="grid gap-4 py-4">
                            <div>
                                <Input type="email" placeholder="Enter your email" />
                            </div>
                            <div className="relative">
                                <Input type="password" placeholder="Enter password" />
                                <Eye className="absolute right-3 top-3 text-gray-400 cursor-pointer" />
                            </div>
                            <Button
                                onClick={handleOpenShift}
                                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                            >
                                Take your shift
                            </Button>
                        </div>
                    </TabsContent>

                    {/* Social Login Tab */}
                    <TabsContent value="social">
                        <div className="flex flex-col gap-3 mt-4">
                            <Button variant="outline" className="flex items-center gap-2">
                                <FaGoogle className="text-red-500" /> Continue with Google
                            </Button>
                            <Button variant="outline" className="flex items-center gap-2">
                                <FaFacebook className="text-blue-600" /> Continue with Facebook
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
